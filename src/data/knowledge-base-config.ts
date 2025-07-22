// Auto-generated knowledge base configuration
// Generated on: 2025-07-22T08:24:29.414Z
// Total contracts processed: 10

export interface EnhancedVulnerabilityPattern {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: RegExp;
  description: string;
  recommendation: string;
  examples: string[];
  cwe?: string;
  prevalence: number;
}

export const ENHANCED_VULNERABILITY_PATTERNS: EnhancedVulnerabilityPattern[] = [
  {
    id: 'enhanced_reentrancy',
    name: 'Reentrancy Vulnerability (Dataset Enhanced)',
    severity: 'critical',
    pattern: /(\.call\s*\{[^}]*\}\s*\([^)]*\)|msg\.sender\.call|address\([^)]*\)\.call)(?!.*require\s*\(.*success)/g,
    description: 'External calls vulnerable to reentrancy attacks',
    recommendation: 'Use ReentrancyGuard, checks-effects-interactions pattern, or pull payment',
    examples: [
      "function withdraw() public {\n    uint256 amount = balances[msg.sender];\n    require(amount > 0, \"No funds\");\n    \n    // Vulnerable: external call before state change\n    (bool success,) = msg.sender.call{value: amount}(\"\");\n    require(success, \"Transfer failed\");\n    \n    balances[msg.sender] = 0; // State change after external call\n}",
      "function emergencyWithdraw() external {\n    uint256 balance = getUserBalance(msg.sender);\n    // Vulnerable: external call in modifier/helper\n    IToken(token).transfer(msg.sender, balance);\n    userBalances[msg.sender] = 0;\n}"
],
    cwe: 'CWE-841',
    prevalence: 0.2
  },
  {
    id: 'enhanced_timestamp',
    name: 'Timestamp Dependence (Dataset Enhanced)',
    severity: 'medium',
    pattern: /(block\.timestamp|now(?!\w)).*(?:require|if|>|<|>=|<=)/g,
    description: 'Logic dependent on block timestamp manipulation',
    recommendation: 'Use block numbers or external oracles for time-dependent logic',
    examples: [
      "function withdraw() public {\n    require(block.timestamp > deadline, \"Too early\");\n    // Vulnerable: miners can manipulate timestamp\n    payable(msg.sender).transfer(balance);\n}",
      "uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % 100;"
],
    cwe: 'CWE-829',
    prevalence: 0.2
  },
  {
    id: 'enhanced_access_control',
    name: 'Access Control Issues (Dataset Enhanced)',
    severity: 'high',
    pattern: /function\s+\w+\s*\([^)]*\)\s*(?:public|external)(?![^{]*\b(?:onlyOwner|require\s*\(.*msg\.sender))/g,
    description: 'Functions lacking proper access control',
    recommendation: 'Implement proper access control modifiers and checks',
    examples: [
      "function withdraw() public {\n    // Missing access control!\n    payable(msg.sender).transfer(address(this).balance);\n}",
      "modifier onlyOwner() {\n    require(tx.origin == owner, \"Not owner\");\n    _; // Should use msg.sender instead of tx.origin\n}"
],
    cwe: 'CWE-284',
    prevalence: 0.2
  },
  {
    id: 'enhanced_overflow',
    name: 'Integer Overflow/Underflow (Dataset Enhanced)',
    severity: 'high',
    pattern: /(?:uint\d*|int\d*)\s+\w+\s*[+\-*\/]=?\s*\w+(?!.*(?:SafeMath|unchecked))/g,
    description: 'Arithmetic operations without overflow protection',
    recommendation: 'Use SafeMath library or Solidity 0.8+ built-in checks',
    examples: [
      "function transfer(address to, uint256 amount) public {\n    balances[msg.sender] -= amount; // Potential underflow\n    balances[to] += amount; // Potential overflow\n}",
      "uint256 total = price * quantity; // Potential overflow\nrequire(msg.value >= total, \"Insufficient payment\");"
],
    cwe: 'CWE-190',
    prevalence: 0.2
  },
  {
    id: 'enhanced_unchecked_call',
    name: 'Unchecked External Calls (Dataset Enhanced)',
    severity: 'high',
    pattern: /(?:\.call\s*\([^)]*\)|payable\([^)]*\)\.(?:send|transfer))\s*;(?!.*(?:require\s*\(|success))/g,
    description: 'External calls without return value verification',
    recommendation: 'Always check return values of external calls',
    examples: [
      "function sendPayment(address to, uint256 amount) public {\n    to.call{value: amount}(\"\"); // Return value not checked\n}",
      "payable(winner).send(prize); // send() can fail silently"
],
    cwe: 'CWE-252',
    prevalence: 0.2
  }
];

export const DATASET_STATISTICS = {
  "totalContracts": 10,
  "vulnerabilityDistribution": {
    "reentrancy": 2,
    "timestamp_dependence": 2,
    "access_control": 2,
    "integer_overflow": 2,
    "unchecked_call": 2
  },
  "processedDate": "2025-07-22T08:24:29.414Z"
};
