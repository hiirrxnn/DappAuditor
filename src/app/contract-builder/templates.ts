// src/app/contract-builder/templates.ts
import React, { ReactNode } from 'react';
import { Cube, Lightning, Gear } from 'phosphor-react';

export interface ContractTemplate {
  name: string;
  description: string;
  icon: ReactNode;
  features: string[];
  defaultParams?: Record<string, string>;
  baseCode: string;
}

// Custom implementation of ERC20 without OpenZeppelin
const ERC20_BASE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CustomToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    
    address public owner;
    bool public paused;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool isPaused);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    constructor(string memory name_, string memory symbol_, uint256 initialSupply) {
        name = name_;
        symbol = symbol_;
        owner = msg.sender;
        _mint(msg.sender, initialSupply * 10**decimals);
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) public whenNotPaused returns (bool) {
        require(to != address(0), "Transfer to zero address");
        
        uint256 senderBalance = _balances[msg.sender];
        require(senderBalance >= amount, "Insufficient balance");
        
        _balances[msg.sender] = senderBalance - amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner_, address spender) public view returns (uint256) {
        return _allowances[owner_][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public whenNotPaused returns (bool) {
        require(to != address(0), "Transfer to zero address");
        
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "Insufficient allowance");
        
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "Insufficient balance");
        
        _balances[from] = fromBalance - amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] = currentAllowance - amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function _mint(address to, uint256 amount) internal virtual {
        require(to != address(0), "Mint to zero address");
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        uint256 accountBalance = _balances[msg.sender];
        require(accountBalance >= amount, "Burn amount exceeds balance");
        _balances[msg.sender] = accountBalance - amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function pause() public onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() public onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}`;

// Custom implementation of NFT without OpenZeppelin
const NFT_BASE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CustomNFT {
    string public name;
    string public symbol;
    address public owner;
    bool public paused;
    
    string private baseURI;
    uint256 private _nextTokenId;
    
    // Token data
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool isPaused);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    constructor(string memory name_, string memory symbol_, string memory baseURI_) {
        name = name_;
        symbol = symbol_;
        baseURI = baseURI_;
        owner = msg.sender;
    }
    
    function balanceOf(address owner_) public view returns (uint256) {
        require(owner_ != address(0), "Zero address");
        return _balances[owner_];
    }
    
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner_ = _owners[tokenId];
        require(owner_ != address(0), "Token doesn't exist");
        return owner_;
    }
    
    function approve(address to, uint256 tokenId) public {
        address owner_ = ownerOf(tokenId);
        require(msg.sender == owner_ || isApprovedForAll(owner_, msg.sender), "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner_, to, tokenId);
    }
    
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        return _tokenApprovals[tokenId];
    }
    
    function setApprovalForAll(address operator, bool approved) public {
        require(msg.sender != operator, "Self approval");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function isApprovedForAll(address owner_, address operator) public view returns (bool) {
        return _operatorApprovals[owner_][operator];
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public whenNotPaused {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        require(ownerOf(tokenId) == from, "Wrong owner");
        require(to != address(0), "Zero address");
        
        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }
    
    function mint(address to) public onlyOwner whenNotPaused returns (uint256) {
        require(to != address(0), "Zero address");
        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to] += 1;
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }
    
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner_ = ownerOf(tokenId);
        return (spender == owner_ || getApproved(tokenId) == spender || isApprovedForAll(owner_, spender));
    }
    
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        string memory _tokenURI = _tokenURIs[tokenId];
        return bytes(_tokenURI).length > 0 ? _tokenURI : string(abi.encodePacked(baseURI, tokenId));
    }
    
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
    }
    
    function pause() public onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() public onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}`;

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    name: 'ERC20 Token',
    description: 'Create a custom ERC20 token with advanced features',
    icon: React.createElement(Cube, { size: 24 }),
    features: ['Mintable', 'Burnable', 'Pausable', 'Access Control'],
    defaultParams: {
      name: 'My Token',
      symbol: 'MTK',
      initialSupply: '1000000'
    },
    baseCode: ERC20_BASE
  },
  {
    name: 'NFT Collection',
    description: 'Launch your own NFT collection with ERC721',
    icon: React.createElement(Lightning, { size: 24 }),
    features: ['Minting', 'Metadata Support', 'Access Control', 'Pausable'],
    defaultParams: {
      name: 'My NFT Collection',
      symbol: 'MNFT',
      baseURI: 'ipfs://'
    },
    baseCode: NFT_BASE
  },
  {
    name: 'Custom Contract',
    description: 'Build a custom smart contract from scratch',
    icon: React.createElement(Gear, { size: 24 }),
    features: ['Full Customization', 'AI Assistance', 'Best Practices', 'Security First'],
    baseCode: ''
  }
];