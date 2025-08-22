// Enhanced SmartBugs dataset integration with comprehensive test patterns
export const SMARTBUGS_EXAMPLES = {
  reentrancy: {
    vulnerablePattern: `
    function withdraw() public {
        uint amount = balances[msg.sender];
        msg.sender.call.value(amount)();
        balances[msg.sender] = 0;
    }`,
    testPattern: `
    // Hardhat/Foundry test for reentrancy prevention
    it("should prevent reentrancy attacks", async function() {
      const attacker = await Attacker.deploy(contract.address);
      await contract.deposit({ value: ethers.parseEther("1") });
      
      await expect(
        attacker.attack()
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });
    
    // Additional comprehensive tests
    it("should maintain correct state during legitimate withdrawals", async function() {
      const initialBalance = await contract.balances(owner.address);
      await contract.withdraw();
      expect(await contract.balances(owner.address)).to.equal(0);
    });`,
    foundryPattern: `
    function test_RevertWhen_ReentrancyAttackAttempted() public {
        vm.expectRevert("ReentrancyGuard: reentrant call");
        attacker.attack();
    }
    
    function testFuzz_WithdrawPreservesInvariant(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 1000 ether);
        contract.deposit{value: amount}();
        uint256 balanceBefore = address(this).balance;
        contract.withdraw();
        assertEq(address(this).balance, balanceBefore + amount);
    }`,
    documentation: "Critical reentrancy vulnerability. Test both malicious reentrancy attempts and legitimate withdrawal flows. Focus on state consistency and proper guard implementation."
  },
  integerOverflow: {
    vulnerablePattern: `
    function transfer(address _to, uint256 _value) {
        balances[msg.sender] -= _value;
        balances[_to] += _value;
    }`,
    testPattern: `
    it("should handle integer overflow safely", async function() {
      const maxUint = ethers.MaxUint256;
      await expect(
        contract.transfer(addr1.address, maxUint)
      ).to.be.revertedWith("SafeMath: subtraction overflow");
    });
    
    it("should handle edge case transfers correctly", async function() {
      // Test with zero value
      await contract.transfer(addr1.address, 0);
      
      // Test with exact balance
      const balance = await contract.balances(owner.address);
      await contract.transfer(addr1.address, balance);
      expect(await contract.balances(owner.address)).to.equal(0);
    });`,
    foundryPattern: `
    function test_RevertWhen_TransferAmountExceedsBalance() public {
        vm.expectRevert("Insufficient balance");
        contract.transfer(alice, type(uint256).max);
    }
    
    function testFuzz_TransferPreservesTotalSupply(address to, uint256 amount) public {
        vm.assume(to != address(0) && amount <= contract.balances(address(this)));
        uint256 totalBefore = contract.totalSupply();
        contract.transfer(to, amount);
        assertEq(contract.totalSupply(), totalBefore);
    }`,
    documentation: "Integer overflow/underflow risks. Test boundary conditions, maximum values, and ensure proper SafeMath usage or Solidity 0.8+ overflow protection."
  },
  accessControl: {
    vulnerablePattern: `
    function withdraw(uint amount) public {
        msg.sender.transfer(amount);
    }`,
    testPattern: `
    it("should restrict access to authorized users only", async function() {
      await expect(
        contract.connect(unauthorized).withdraw(100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("should allow owner to withdraw successfully", async function() {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await contract.connect(owner).withdraw(ethers.parseEther("1"));
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });`,
    foundryPattern: `
    function test_RevertWhen_NonOwnerCallsWithdraw() public {
        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        contract.withdraw(1 ether);
    }
    
    function test_OwnerCanWithdraw() public {
        uint256 balanceBefore = address(owner).balance;
        vm.prank(owner);
        contract.withdraw(1 ether);
        assertEq(address(owner).balance, balanceBefore + 1 ether);
    }`,
    documentation: "Access control vulnerability. Test both unauthorized access attempts and legitimate authorized operations. Verify modifier effectiveness and role-based permissions."
  },
  frontRunning: {
    vulnerablePattern: `
    function commitReveal(bytes32 commitment) public {
        commitments[msg.sender] = commitment;
        // Vulnerable to front-running
    }`,
    testPattern: `
    it("should prevent front-running attacks", async function() {
      const secret = "mysecret";
      const commitment = ethers.keccak256(ethers.toUtf8Bytes(secret));
      
      // Simulate front-running scenario
      await contract.connect(user1).commitReveal(commitment);
      
      // Attacker tries to copy commitment
      await expect(
        contract.connect(attacker).commitReveal(commitment)
      ).to.be.revertedWith("Commitment already exists");
    });`,
    foundryPattern: `
    function test_RevertWhen_DuplicateCommitment() public {
        bytes32 commitment = keccak256("secret");
        contract.commitReveal(commitment);
        
        vm.expectRevert("Commitment already exists");
        contract.commitReveal(commitment);
    }`,
    documentation: "Front-running vulnerability. Implement commit-reveal schemes, time-locks, or other MEV protection mechanisms."
  },
  gasLimit: {
    vulnerablePattern: `
    function distributeRewards(address[] memory recipients) public {
        for (uint i = 0; i < recipients.length; i++) {
            payable(recipients[i]).transfer(reward);
        }
    }`,
    testPattern: `
    it("should handle large recipient lists without running out of gas", async function() {
      const manyRecipients = Array(100).fill(0).map(() => ethers.Wallet.createRandom().address);
      
      // This should either work or fail gracefully
      try {
        await contract.distributeRewards(manyRecipients);
      } catch (error) {
        expect(error.message).to.include("out of gas");
      }
    });`,
    foundryPattern: `
    function test_GasLimitWithManyRecipients() public {
        address[] memory recipients = new address[](200);
        for (uint i = 0; i < 200; i++) {
            recipients[i] = address(uint160(i + 1));
        }
        
        // Test should handle gas limit gracefully
        contract.distributeRewards(recipients);
    }`,
    documentation: "Gas limit DoS vulnerability. Test with large arrays and loops. Implement pagination or batch processing."
  },
  oracle: {
    vulnerablePattern: `
    function updatePrice() public {
        uint256 price = oracle.getPrice();
        currentPrice = price; // No validation!
    }`,
    testPattern: `
    it("should validate oracle price feeds", async function() {
      // Mock malicious oracle
      await mockOracle.setPrice(0);
      
      await expect(
        contract.updatePrice()
      ).to.be.revertedWith("Invalid price");
    });`,
    foundryPattern: `
    function test_RevertWhen_OraclePriceIsZero() public {
        oracle.setPrice(0);
        vm.expectRevert("Invalid price");
        contract.updatePrice();
    }`,
    documentation: "Oracle manipulation vulnerability. Always validate external price feeds and implement circuit breakers."
  }
};

export function getVulnerabilityContext(code: string): any[] {
  const context = [];
  
  // Enhanced pattern detection with more comprehensive checks
  
  // Reentrancy patterns
  if (code.includes('.call{value:') || code.includes('.call.value') || 
      code.includes('.transfer(') || code.includes('.send(')) {
    context.push(SMARTBUGS_EXAMPLES.reentrancy);
  }
  
  // Integer overflow patterns
  if (code.includes('+=') || code.includes('-=') || code.includes('++') || 
      code.includes('--') || (code.includes('*') && code.includes('uint'))) {
    context.push(SMARTBUGS_EXAMPLES.integerOverflow);
  }
  
  // Access control patterns
  if (!code.includes('onlyOwner') && !code.includes('require(msg.sender') && 
      !code.includes('modifier') && code.includes('function') && 
      (code.includes('withdraw') || code.includes('transfer') || code.includes('admin'))) {
    context.push(SMARTBUGS_EXAMPLES.accessControl);
  }
  
  // Front-running patterns
  if (code.includes('commit') || code.includes('reveal') || code.includes('auction') ||
      code.includes('bid')) {
    context.push(SMARTBUGS_EXAMPLES.frontRunning);
  }
  
  // Gas limit DoS patterns
  if (code.includes('for (') || code.includes('while (') || 
      (code.includes('[]') && code.includes('length'))) {
    context.push(SMARTBUGS_EXAMPLES.gasLimit);
  }
  
  // Oracle manipulation patterns
  if (code.includes('oracle') || code.includes('price') || code.includes('getPrice') ||
      code.includes('chainlink') || code.includes('aggregator')) {
    context.push(SMARTBUGS_EXAMPLES.oracle);
  }
  
  return context;
}

// Helper function to get framework-specific test patterns
export function getFrameworkTestPattern(vulnerability: string, framework: 'hardhat' | 'foundry' | 'remix'): string {
  const vuln = SMARTBUGS_EXAMPLES[vulnerability as keyof typeof SMARTBUGS_EXAMPLES];
  if (!vuln) return '';
  
  switch (framework) {
    case 'foundry':
      return vuln.foundryPattern || vuln.testPattern;
    case 'hardhat':
      return vuln.testPattern;
    case 'remix':
      return `**Manual Test for ${vulnerability}:**\n${vuln.documentation}\n\nTest Steps:\n1. Deploy contract\n2. Attempt vulnerable operation\n3. Verify security measures`;
    default:
      return vuln.testPattern;
  }
}