// SmartBugs dataset integration
export const SMARTBUGS_EXAMPLES = {
  reentrancy: {
    vulnerablePattern: `
    function withdraw() public {
        uint amount = balances[msg.sender];
        msg.sender.call.value(amount)();
        balances[msg.sender] = 0;
    }`,
    testPattern: `
    it("should prevent reentrancy attacks", async function() {
      const attacker = await Attacker.deploy(contract.address);
      await contract.deposit({ value: ethers.parseEther("1") });
      
      await expect(
        attacker.attack()
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });`,
    documentation: "This function is vulnerable to reentrancy attacks. External calls should follow the checks-effects-interactions pattern."
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
    });`,
    documentation: "This transfer function lacks overflow protection. Use SafeMath or Solidity 0.8+ for automatic overflow checks."
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
    });`,
    documentation: "This function lacks access control. Add onlyOwner or role-based modifiers to restrict access."
  }
};

export function getVulnerabilityContext(code: string): any[] {
  const context = [];
  
  // Detect patterns and add relevant examples
  if (code.includes('.call.value') || code.includes('.transfer')) {
    context.push(SMARTBUGS_EXAMPLES.reentrancy);
  }
  
  if (code.includes('+=') || code.includes('-=')) {
    context.push(SMARTBUGS_EXAMPLES.integerOverflow);
  }
  
  if (!code.includes('onlyOwner') && !code.includes('require(msg.sender')) {
    context.push(SMARTBUGS_EXAMPLES.accessControl);
  }
  
  return context;
}