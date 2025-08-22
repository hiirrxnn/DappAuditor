// src/scripts/initializePinecone.ts
import { vectorStore } from '../utils/vectorStore';

const SAMPLE_CONTRACTS = [
  {
    id: 'reentrancy_vulnerable',
    chunk: `contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        (bool success,) = msg.sender.call{value: amount}("");
        balances[msg.sender] = 0; // State change after external call - VULNERABLE
    }
}`,
    metadata: {
      contractType: 'defi',
      vulnerability: 'reentrancy',
      pattern: 'vulnerable_withdrawal',
      securityLevel: 'low' as const,
      documentationNotes: 'Test focus: reentrancy attacks, malicious contract calls, state consistency checks'
    }
  },
  {
    id: 'reentrancy_safe',
    chunk: `contract SafeBank {
    mapping(address => uint256) public balances;
    bool private locked;
    
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0; // State change before external call
        (bool success,) = msg.sender.call{value: amount}("");
    }
}`,
    metadata: {
      contractType: 'defi',
      pattern: 'reentrancy_guard',
      securityLevel: 'high' as const,
      documentationNotes: 'Test patterns: modifier effectiveness, state changes order, gas optimization for guards'
    }
  },
  {
    id: 'erc20_standard',
    chunk: `contract StandardToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}`,
    metadata: {
      contractType: 'token',
      pattern: 'erc20_implementation',
      securityLevel: 'high' as const,
      documentationNotes: 'Test coverage: ERC20 compliance, edge cases (zero transfers), event emissions, allowance mechanics'
    }
  },
  {
    id: 'access_control_vulnerable',
    chunk: `contract VulnerableWallet {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    function withdraw(uint256 amount) external {
        // Missing access control!
        payable(msg.sender).transfer(amount);
    }
    
    function deposit() external payable {}
}`,
    metadata: {
      contractType: 'wallet',
      vulnerability: 'access_control',
      pattern: 'missing_modifiers',
      securityLevel: 'low' as const,
      documentationNotes: 'Test focus: unauthorized access attempts, role-based permissions, owner-only functions'
    }
  },
  {
    id: 'access_control_secure',
    chunk: `contract SecureWallet {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function withdraw(uint256 amount) external onlyOwner {
        payable(owner).transfer(amount);
    }
    
    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}`,
    metadata: {
      contractType: 'wallet',
      pattern: 'access_control_secure',
      securityLevel: 'high' as const,
      documentationNotes: 'Test patterns: modifier validation, role transitions, unauthorized access prevention'
    }
  },
  {
    id: 'overflow_vulnerable',
    chunk: `contract VulnerableCounter {
    uint8 public count = 0;
    
    function increment() external {
        count += 1; // Can overflow at 255
    }
    
    function add(uint8 value) external {
        count += value; // Potential overflow
    }
}`,
    metadata: {
      contractType: 'utility',
      vulnerability: 'integer_overflow',
      pattern: 'arithmetic_unsafe',
      securityLevel: 'medium' as const,
      documentationNotes: 'Test approach: boundary values, overflow conditions, SafeMath usage validation'
    }
  },
  {
    id: 'nft_marketplace',
    chunk: `contract NFTMarketplace {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }
    
    mapping(uint256 => Listing) public listings;
    
    function listNFT(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be positive");
        listings[tokenId] = Listing(msg.sender, price, true);
    }
    
    function buyNFT(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Not for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        
        listings[tokenId].active = false;
        payable(listing.seller).transfer(listing.price);
        
        // Transfer NFT to buyer (simplified)
    }
}`,
    metadata: {
      contractType: 'marketplace',
      pattern: 'nft_trading',
      securityLevel: 'medium' as const,
      documentationNotes: 'Test scenarios: price validation, state transitions, payment handling, ownership transfers'
    }
  },
  {
    id: 'multisig_wallet',
    chunk: `contract MultiSigWallet {
    address[] public owners;
    uint256 public required;
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    
    modifier onlyOwner() {
        require(isOwner(msg.sender), "Not an owner");
        _;
    }
    
    function submitTransaction(address to, uint256 value, bytes memory data) external onlyOwner {
        uint256 txId = transactions.length;
        transactions[txId] = Transaction(to, value, data, false, 0);
    }
    
    function confirmTransaction(uint256 txId) external onlyOwner {
        require(!confirmations[txId][msg.sender], "Already confirmed");
        confirmations[txId][msg.sender] = true;
        transactions[txId].confirmations++;
        
        if (transactions[txId].confirmations >= required) {
            executeTransaction(txId);
        }
    }
    
    function isOwner(address account) public view returns (bool) {
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == account) return true;
        }
        return false;
    }
}`,
    metadata: {
      contractType: 'wallet',
      pattern: 'multisig_governance',
      securityLevel: 'high' as const,
      documentationNotes: 'Test complexity: multi-party consensus, threshold validation, transaction execution, owner management'
    }
  }
];

async function initializePinecone() {
  console.log('🚀 Initializing Pinecone...');
  
  // Debug: Check if environment variables are available
  console.log('PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY);
  console.log('GOOGLE_AI_API_KEY exists:', !!process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY);
  
  const initialized = await vectorStore.initializeIndex();
  if (!initialized) {
    throw new Error('Failed to initialize Pinecone');
  }
  
  await vectorStore.upsertDocuments(SAMPLE_CONTRACTS);
  console.log('✅ Pinecone initialization complete!');
  console.log(`📊 Uploaded ${SAMPLE_CONTRACTS.length} contract patterns for RAG-enhanced testing`);
  console.log('🧪 Available test patterns:', SAMPLE_CONTRACTS.map(c => c.metadata.pattern).join(', '));
}

if (require.main === module) {
  initializePinecone().catch(console.error);
}

export { initializePinecone };