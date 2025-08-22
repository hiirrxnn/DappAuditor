import { vectorStore } from '@/utils/vectorStore';
import { chunkSolidityCode } from '@/utils/embeddings';
import { SMARTBUGS_EXAMPLES } from '@/utils/smartBugsData';

export async function initializeSmartBugsData() {
  console.log('🚀 Initializing SmartBugs RAG data...');
  
  try {
    // Clear existing data
    vectorStore.clearStorage();
    
    // Add vulnerability examples
    for (const [vulnType, example] of Object.entries(SMARTBUGS_EXAMPLES)) {
      console.log(`📝 Adding ${vulnType} examples...`);
      
      const chunks = chunkSolidityCode(example.vulnerablePattern);
      
      await vectorStore.upsertContract(
        example.vulnerablePattern,
        {
          vulnerabilities: [vulnType],
          testPatterns: [example.testPattern],
          documentationNotes: [example.documentation],
          contractType: 'vulnerable_example'
        },
        chunks
      );
    }
    
    // Add more comprehensive examples
    await addMoreExamples();
    
    const stats = vectorStore.getStats();
    console.log('✅ SmartBugs data initialized successfully!');
    console.log('📊 Stats:', stats);
    
  } catch (error) {
    console.error('❌ Error initializing RAG:', error);
  }
}

async function addMoreExamples() {
  // Add a comprehensive vulnerable contract
  const vulnerableContract = `
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    // VULNERABLE: Reentrancy + No access control
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Vulnerable external call before state change
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount; // State change after external call!
    }
    
    // VULNERABLE: No access control
    function emergencyWithdraw() public {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    // VULNERABLE: Integer overflow (if using older Solidity)
    function unsafeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b; // No overflow protection
    }
}`;

  const testPattern = `
describe("VulnerableBank Security Tests", function() {
  it("should prevent reentrancy attacks", async function() {
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await ReentrancyAttacker.deploy(bank.address);
    
    await bank.deposit({ value: ethers.parseEther("1") });
    await attacker.deposit({ value: ethers.parseEther("1") });
    
    await expect(attacker.attack()).to.be.revertedWith("ReentrancyGuard");
  });
  
  it("should restrict emergency withdraw to owner only", async function() {
    await expect(
      bank.connect(user1).emergencyWithdraw()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
  
  it("should handle integer overflow safely", async function() {
    const maxUint = ethers.MaxUint256;
    await expect(
      bank.unsafeAdd(maxUint, 1)
    ).to.be.revertedWith("Arithmetic operation overflow");
  });
});`;

  const documentation = `
# VulnerableBank Security Analysis

## Critical Vulnerabilities

### 1. Reentrancy Attack (High Risk)
- **Location**: withdraw() function
- **Issue**: External call before state change
- **Fix**: Use checks-effects-interactions pattern

### 2. Missing Access Control (High Risk)  
- **Location**: emergencyWithdraw() function
- **Issue**: Anyone can drain the contract
- **Fix**: Add onlyOwner modifier

### 3. Integer Overflow (Medium Risk)
- **Location**: unsafeAdd() function  
- **Issue**: No overflow protection
- **Fix**: Use SafeMath or Solidity 0.8+
`;

  const chunks = chunkSolidityCode(vulnerableContract);
  
  await vectorStore.upsertContract(
    vulnerableContract,
    {
      vulnerabilities: ['reentrancy', 'accessControl', 'integerOverflow'],
      testPatterns: [testPattern],
      documentationNotes: [documentation],
      contractType: 'comprehensive_example'
    },
    chunks
  );
}

// Run initialization
initializeSmartBugsData();