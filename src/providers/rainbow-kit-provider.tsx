'use client';

import { useState, useEffect } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
  Theme,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Project ID for WalletConnect
// For demo purposes we're using a hardcoded ID, but in production you should use an environment variable
const projectId = 'b8ad206ba9492e6096fa0aa0f868586c';

// Configure the wagmi client with Rainbow Kit
const config = getDefaultConfig({
  appName: 'AuditFi',
  projectId,
  chains: [sepolia], // Use Sepolia from wagmi/chains
  transports: {
    [sepolia.id]: http(),
  },
  ssr: true, // Enable server-side rendering support
});

// Create a custom theme that matches AuditFi's UI
const auditFiTheme = {
  ...darkTheme(),
  colors: {
    ...darkTheme().colors,
    accentColor: '#3b82f6', // Blue color to match your gradient
    accentColorForeground: 'white',
    connectButtonBackground: '#1e293b', // Darker background
    connectButtonText: 'white',
  },
  radii: {
    ...darkTheme().radii,
    connectButton: '0.5rem', // Rounded corners similar to your UI
  },
} as Theme;

// Create query client for React Query
const queryClient = new QueryClient();

export function RainbowKitProviderWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Handle hydration issue in Next.js and prevent multiple initializations
  useEffect(() => {
    setMounted(true);
    
    // Cleanup function to handle component unmounting
    return () => {
      // Clean up any resources if needed
    };
  }, []);

  // Skip rendering until the component is mounted to prevent hydration errors
  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={auditFiTheme}
          showRecentTransactions={false} // Hide recent transactions
          modalSize="compact"
          appInfo={{
            appName: 'AuditFi',
            learnMoreUrl: 'https://sepolia.etherscan.io',
          }}
          initialChain={sepolia.id} // Always start on Sepolia
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}