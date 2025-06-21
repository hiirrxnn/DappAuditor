// constants/contracts.ts
export const CONTRACT_ADDRESSES = {
  sepolia: '0xd9145CCE52D386f254917e481eB44e9943F39138', // You'll need to deploy your contract here
} as const;

export const AUDIT_REGISTRY_ABI = [
  "function registerAudit(bytes32 contractHash, uint8 stars, string calldata summary) external",
  "function getContractAudits(bytes32 contractHash) external view returns (tuple(uint8 stars, string summary, address auditor, uint256 timestamp)[])",
  "function getAuditorHistory(address auditor) external view returns (bytes32[])",
  "function getLatestAudit(bytes32 contractHash) external view returns (tuple(uint8 stars, string summary, address auditor, uint256 timestamp))",
  "function getAllAudits(uint256 startIndex, uint256 limit) external view returns (bytes32[] contractHashes, uint8[] stars, string[] summaries, address[] auditors, uint256[] timestamps)",
  "function getTotalContracts() external view returns (uint256)",
  "event AuditRegistered(bytes32 indexed contractHash, uint8 stars, string summary, address indexed auditor, uint256 timestamp)"
] as const;

export type ChainKey = keyof typeof CONTRACT_ADDRESSES;