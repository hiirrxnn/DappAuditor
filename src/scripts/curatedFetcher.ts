import { CONTRACT_SOURCES } from './contractSources';

interface CuratedContractData {
  id: string;
  chunk: string;
  metadata: {
    contractType: string;
    vulnerability?: string;
    pattern: string;
    solidityVersion: string;
    securityLevel: 'high' | 'medium' | 'low';
    documentationNotes: string;
    source: 'curated';
    repository: string;
    tags: string[];
  };
}

export class CuratedFetcher {
  private rateLimitDelay = 150;

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchContractFromUrl(url: string): Promise<string> {
    try {
      console.log(`🔍 Fetching curated contract: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      await this.delay(this.rateLimitDelay);
      
      return content;
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error);
      return '';
    }
  }

  private extractSolidityVersion(content: string): string {
    const pragmaMatch = content.match(/pragma\\s+solidity\\s+([^;]+);/);
    if (pragmaMatch) {
      return pragmaMatch[1].replace(/[^0-9.^>=<~]/g, '');
    }
    return 'unknown';
  }

  private enhanceDocumentationNotes(contractName: string, tags: string[], content: string): string {
    const code = content.toLowerCase();
    const notes: string[] = [];
    
    // Base documentation based on name and tags
    if (contractName.includes('OpenZeppelin')) {
      notes.push('Industry standard implementation with comprehensive security measures');
    }
    
    if (tags.includes('erc20')) {
      notes.push('Test focus: ERC20 compliance, transfer mechanics, approval patterns, total supply management');
    }
    
    if (tags.includes('erc721')) {
      notes.push('Test focus: NFT uniqueness, metadata handling, transfer restrictions, approval mechanisms');
    }
    
    if (tags.includes('access-control')) {
      notes.push('Test focus: role-based permissions, privilege escalation prevention, role assignment/revocation');
    }
    
    if (tags.includes('reentrancy')) {
      notes.push('Test focus: reentrancy protection effectiveness, state consistency, external call safety');
    }
    
    if (tags.includes('uniswap')) {
      notes.push('Test focus: AMM mechanics, liquidity management, slippage protection, fee calculation');
    }
    
    if (tags.includes('compound')) {
      notes.push('Test focus: lending/borrowing logic, interest rate calculations, liquidation mechanisms');
    }
    
    if (tags.includes('aave')) {
      notes.push('Test focus: flash loan implementation, variable interest rates, health factor calculations');
    }
    
    if (tags.includes('chainlink')) {
      notes.push('Test focus: oracle data integrity, price feed validation, staleness checks');
    }
    
    if (tags.includes('multisig')) {
      notes.push('Test focus: signature validation, threshold requirements, transaction execution safety');
    }
    
    // Advanced pattern detection
    if (code.includes('flashloan') || code.includes('flash loan')) {
      notes.push('Advanced: Flash loan atomicity, callback validation, fee calculation accuracy');
    }
    
    if (code.includes('proxy') && code.includes('upgrade')) {
      notes.push('Advanced: Upgrade safety, storage layout compatibility, admin control security');
    }
    
    if (code.includes('timelock')) {
      notes.push('Advanced: Time delay enforcement, proposal queuing/execution, emergency procedures');
    }
    
    if (code.includes('merkle') || code.includes('proof')) {
      notes.push('Advanced: Merkle proof validation, whitelist verification, claim mechanisms');
    }
    
    if (code.includes('staking') || code.includes('reward')) {
      notes.push('Advanced: Staking mechanics, reward distribution, slashing conditions');
    }
    
    // Security considerations
    if (code.includes('assembly') || code.includes('delegatecall')) {
      notes.push('Security: Low-level operations require careful validation and testing');
    }
    
    if (code.includes('selfdestruct')) {
      notes.push('Security: Contract destruction mechanisms need thorough access control testing');
    }
    
    return notes.length > 0 ? notes.join('. ') : 'Comprehensive testing recommended for all contract functions';
  }

  async fetchAllCuratedContracts(): Promise<CuratedContractData[]> {
    const contracts: CuratedContractData[] = [];
    
    console.log(`🚀 Fetching ${CONTRACT_SOURCES.CURATED_CONTRACTS.length} curated high-quality contracts...`);
    
    for (const contractConfig of CONTRACT_SOURCES.CURATED_CONTRACTS) {
      try {
        const content = await this.fetchContractFromUrl(contractConfig.url);
        
        if (!content || content.length < 200) {
          console.warn(`⚠️ Skipping ${contractConfig.name} - insufficient content`);
          continue;
        }
        
        // Skip if it's not a contract file
        if (!content.includes('contract ') && !content.includes('library ')) {
          console.warn(`⚠️ Skipping ${contractConfig.name} - not a contract file`);
          continue;
        }
        
        const enhancedNotes = this.enhanceDocumentationNotes(
          contractConfig.name, 
          contractConfig.tags, 
          content
        );
        
        const contractData: CuratedContractData = {
          id: `curated_${contractConfig.name.toLowerCase().replace(/\\s+/g, '_')}`,
          chunk: content.length > 12000 ? content.substring(0, 12000) : content, // Larger chunks for high-quality contracts
          metadata: {
            contractType: contractConfig.category,
            pattern: `${contractConfig.category}_${contractConfig.tags[0] || 'standard'}`,
            solidityVersion: this.extractSolidityVersion(content),
            securityLevel: contractConfig.securityLevel,
            documentationNotes: enhancedNotes,
            source: 'curated',
            repository: this.extractRepositoryFromUrl(contractConfig.url),
            tags: contractConfig.tags
          }
        };
        
        contracts.push(contractData);
        console.log(`✅ Successfully fetched ${contractConfig.name} (${contractConfig.tags.join(', ')})`);
        
      } catch (error) {
        console.error(`❌ Error fetching ${contractConfig.name}:`, error);
      }
    }
    
    console.log(`🎉 Successfully fetched ${contracts.length} curated contracts`);
    return contracts;
  }

  private extractRepositoryFromUrl(url: string): string {
    const match = url.match(/github\\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : 'unknown';
  }
}

// Additional high-quality contracts to add to our curated list
export const ADDITIONAL_CURATED_CONTRACTS = [
  // Vulnerability examples for better testing
  {
    name: 'Reentrancy Attack Example',
    content: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReentrancyVulnerable {
    mapping(address => uint256) public balances;
    
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount; // Vulnerable: state change after external call
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`,
    category: 'vulnerable',
    securityLevel: 'low' as const,
    tags: ['reentrancy', 'vulnerable', 'example']
  },
  
  {
    name: 'Integer Overflow Example',
    content: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6; // Intentionally old version without built-in overflow protection

contract IntegerOverflow {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    function mint(address to, uint256 amount) external {
        balances[to] += amount; // Vulnerable to overflow
        totalSupply += amount; // Vulnerable to overflow
    }
    
    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount; // Vulnerable to underflow
        balances[to] += amount; // Vulnerable to overflow
    }
}`,
    category: 'vulnerable',
    securityLevel: 'low' as const,
    tags: ['overflow', 'underflow', 'vulnerable', 'arithmetic']
  },
  
  {
    name: 'Access Control Vulnerability',
    content: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AccessControlVuln {
    address public owner;
    mapping(address => uint256) public balances;
    
    constructor() {
        owner = msg.sender;
    }
    
    function withdraw(uint256 amount) external {
        // Missing access control - anyone can withdraw!
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(msg.sender).transfer(amount);
    }
    
    function emergencyDrain() external {
        // Only owner should be able to do this
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}`,
    category: 'vulnerable',
    securityLevel: 'low' as const,
    tags: ['access-control', 'vulnerable', 'authorization']
  },
  
  {
    name: 'Secure Multi-Signature Wallet',
    content: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureMultiSigWallet {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(address indexed owner, uint256 indexed txIndex, address indexed to, uint256 value, bytes data);
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "tx does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
        _;
    }

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "owners required");
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "invalid number of required confirmations");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function submitTransaction(address _to, uint256 _value, bytes memory _data) public onlyOwner {
        uint256 txIndex = transactions.length;

        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numConfirmations: 0
        }));

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(transaction.numConfirmations >= numConfirmationsRequired, "cannot execute tx");

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "tx failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }
}`,
    category: 'wallet',
    securityLevel: 'high' as const,
    tags: ['multisig', 'wallet', 'secure', 'governance']
  }
];