import { QueryClient } from "@tanstack/react-query";
import { http, createConfig } from "wagmi";
import { metaMask } from "wagmi/connectors";

// Debug the MetaMask connector
const connector = metaMask();
console.log("MetaMask connector created:", connector);

// Create custom chain definition for Sepolia Testnet
const sepoliaTestnet = {
  id: 11155111, // Sepolia testnet chain ID
  name: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.org'] },
    public: { http: ['https://rpc.sepolia.org'] },
  },
  blockExplorers: {
    default: { name: 'Sepolia Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};

export const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  ssr: true,
  chains: [sepoliaTestnet],
  connectors: [connector],
  transports: {
    [sepoliaTestnet.id]: http(),
  },
});

// Debug the created config
console.log("Wagmi config created with chains:", wagmiConfig.chains);
console.log("Wagmi config connectors:", wagmiConfig.connectors);