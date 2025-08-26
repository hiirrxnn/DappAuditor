// Contract data sources configuration
export const CONTRACT_SOURCES = {
  // High-quality curated contracts from famous projects
  CURATED_CONTRACTS: [
    // OpenZeppelin Standards
    {
      name: 'OpenZeppelin ERC20',
      url: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/token/ERC20/ERC20.sol',
      category: 'token',
      securityLevel: 'high' as const,
      tags: ['erc20', 'standard', 'openzeppelin']
    },
    {
      name: 'OpenZeppelin ERC721',
      url: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/token/ERC721/ERC721.sol',
      category: 'nft',
      securityLevel: 'high' as const,
      tags: ['erc721', 'nft', 'openzeppelin']
    },
    {
      name: 'OpenZeppelin AccessControl',
      url: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/access/AccessControl.sol',
      category: 'access',
      securityLevel: 'high' as const,
      tags: ['access-control', 'rbac', 'openzeppelin']
    },
    {
      name: 'OpenZeppelin ReentrancyGuard',
      url: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/utils/ReentrancyGuard.sol',
      category: 'security',
      securityLevel: 'high' as const,
      tags: ['reentrancy', 'guard', 'security']
    },
    {
      name: 'OpenZeppelin Pausable',
      url: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/utils/Pausable.sol',
      category: 'utility',
      securityLevel: 'high' as const,
      tags: ['pausable', 'emergency', 'utility']
    },
    
    // Uniswap V3 Core
    {
      name: 'Uniswap V3 Pool',
      url: 'https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/UniswapV3Pool.sol',
      category: 'defi',
      securityLevel: 'high' as const,
      tags: ['uniswap', 'amm', 'defi', 'liquidity']
    },
    {
      name: 'Uniswap V3 Factory',
      url: 'https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/UniswapV3Factory.sol',
      category: 'defi',
      securityLevel: 'high' as const,
      tags: ['uniswap', 'factory', 'defi']
    },
    
    // Compound Finance
    {
      name: 'Compound cToken',
      url: 'https://raw.githubusercontent.com/compound-finance/compound-protocol/master/contracts/CToken.sol',
      category: 'defi',
      securityLevel: 'high' as const,
      tags: ['compound', 'lending', 'interest']
    },
    {
      name: 'Compound Comptroller',
      url: 'https://raw.githubusercontent.com/compound-finance/compound-protocol/master/contracts/Comptroller.sol',
      category: 'defi',
      securityLevel: 'high' as const,
      tags: ['compound', 'controller', 'risk-management']
    },
    
    // Aave
    {
      name: 'Aave LendingPool',
      url: 'https://raw.githubusercontent.com/aave/aave-v3-core/master/contracts/protocol/pool/Pool.sol',
      category: 'defi',
      securityLevel: 'high' as const,
      tags: ['aave', 'lending', 'flashloan']
    },
    
    // Chainlink
    {
      name: 'Chainlink AggregatorV3',
      url: 'https://raw.githubusercontent.com/smartcontractkit/chainlink/develop/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol',
      category: 'oracle',
      securityLevel: 'high' as const,
      tags: ['chainlink', 'oracle', 'price-feed']
    },
    
    // MakerDAO
    {
      name: 'MakerDAO Vat',
      url: 'https://raw.githubusercontent.com/makerdao/dss/master/src/vat.sol',
      category: 'defi',
      securityLevel: 'high' as const,
      tags: ['makerdao', 'dai', 'vault']
    },
    
    // Popular NFT Projects
    {
      name: 'CryptoPunks',
      url: 'https://raw.githubusercontent.com/larvalabs/cryptopunks/master/contracts/CryptoPunksMarket.sol',
      category: 'nft',
      securityLevel: 'medium' as const,
      tags: ['nft', 'marketplace', 'cryptopunks']
    },
    
    // Gnosis Safe
    {
      name: 'Gnosis Safe',
      url: 'https://raw.githubusercontent.com/safe-global/safe-contracts/main/contracts/GnosisSafe.sol',
      category: 'wallet',
      securityLevel: 'high' as const,
      tags: ['multisig', 'wallet', 'gnosis']
    },
    
    // 1inch
    {
      name: '1inch AggregationRouterV5',
      url: 'https://raw.githubusercontent.com/1inch/1inch-v5-contracts/master/contracts/AggregationRouterV5.sol',
      category: 'defi',
      securityLevel: 'high' as const,
      tags: ['1inch', 'dex-aggregator', 'routing']
    }
  ],
  
  // Etherscan verified contract addresses to fetch
  ETHERSCAN_CONTRACTS: [
    // Major tokens
    { address: '0xA0b86a33E6441c8C76D9dC7C05D18a7c4ac3F8aa', name: 'USDC', category: 'token' },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'DAI', category: 'token' },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', name: 'USDT', category: 'token' },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', name: 'WBTC', category: 'token' },
    
    // DeFi protocols
    { address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', name: 'Aave LendingPool', category: 'defi' },
    { address: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B', name: 'Compound cETH', category: 'defi' },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', name: 'Uniswap Token', category: 'governance' },
    
    // NFT collections
    { address: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB', name: 'CryptoPunks', category: 'nft' },
    { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', name: 'BAYC', category: 'nft' },
    { address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', name: 'MAYC', category: 'nft' },
    
    // Popular contracts
    { address: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5', name: 'Ens Registry', category: 'identity' },
    { address: '0x00000000006c3852cbEf3e08E8dF289169EdE581', name: 'OpenSea Seaport', category: 'marketplace' }
  ],
  
  // GitHub repositories to crawl
  GITHUB_REPOS: [
    { owner: 'OpenZeppelin', repo: 'openzeppelin-contracts', path: 'contracts' },
    { owner: 'Uniswap', repo: 'v3-core', path: 'contracts' },
    { owner: 'Uniswap', repo: 'v2-core', path: 'contracts' },
    { owner: 'compound-finance', repo: 'compound-protocol', path: 'contracts' },
    { owner: 'aave', repo: 'aave-v3-core', path: 'contracts' },
    { owner: 'smartcontractkit', repo: 'chainlink', path: 'contracts/src' },
    { owner: 'makerdao', repo: 'dss', path: 'src' },
    { owner: 'safe-global', repo: 'safe-contracts', path: 'contracts' },
    { owner: '1inch', repo: '1inch-v5-contracts', path: 'contracts' }
  ]
};