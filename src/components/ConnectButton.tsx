import { SignOut } from '@phosphor-icons/react';
import { useAccount, useConnect, useDisconnect } from "wagmi";
import Image from 'next/image';
import { useEffect } from 'react';

export const ConnectButton = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Format address for display
  const formattedAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  // Debug logs to see what's happening
  useEffect(() => {
    console.log('ConnectButton rendered');
    console.log('isConnected:', isConnected);
    console.log('address:', address);
    console.log('connectors available:', connectors.length);
    connectors.forEach((c, i) => {
      console.log(`Connector ${i}:`, c.id, c.name);
    });
    console.log('error:', error);
  }, [isConnected, address, connectors, error]);

  const handleConnect = () => {
    console.log('Connect button clicked');
    
    // Use the first available connector instead of looking for a specific ID
    if (connectors.length > 0) {
      const connector = connectors[0];
      console.log('Using connector:', connector.id, connector.name);
      connect({ connector });
    } else {
      console.error('No connectors available');
    }
  };

  return (
    <div>
      {isConnected && address ? (
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-dark-100 hover:bg-dark-200 text-white font-bold rounded-lg transition-all duration-200 shadow-md flex items-center gap-2"
        >
          <SignOut weight="bold" className="w-4 h-4" />
          {formattedAddress}
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={handleConnect}
          className="px-4 py-2 bg-dark-100 hover:bg-dark-200 text-white font-bold rounded-lg transition-all duration-200 shadow-md flex items-center gap-2"
        >
          <Image 
            src="/chains/metamask.svg" 
            alt="MetaMask" 
            width={20} 
            height={20} 
          />
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      {error && <div className="text-red-500 text-sm mt-2">{error.message}</div>}
    </div>
  );
}; 