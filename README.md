# DappAuditor 🛡️

![DappAuditor Interface](https://github.com/user-attachments/assets/f168e5ab-acea-4557-befa-da0b2a31e246)

DappAuditor combines cutting-edge AI with blockchain technology to create the ultimate smart contract security platform. Our solution doesn't just find vulnerabilities — it provides comprehensive documentation, test generation, and on-chain audit verification, establishing a new standard for transparency and trust in the blockchain security space.

## 🌟 Key Features

### Advanced AI-Powered Analysis
- **Mistral AI Engine**: Primary smart contract analysis powered by Mistral AI for comprehensive vulnerability detection
- **Custom Fine-tuned Llama-2 Model**: Optional specialized model (audicarkey/llama2-smart-contract-vulnerability-detector) available for enhanced analysis
- **Comprehensive Vulnerability Detection**: Identifies common and novel security issues including reentrancy, access control, integer overflow, and more
- **Actionable Remediation Guidance**: Clear, specific recommendations to resolve detected vulnerabilities
- **RAG-Enhanced Analysis**: Leverages Pinecone vector database for contextual vulnerability pattern matching

### Complete Ethereum Integration
- **Sepolia Testnet Deployment**: Seamless deployment pipeline to Ethereum Sepolia testnet
- **Network-Specific Validation**: Security checks tailored to Ethereum's architecture
- **Gas Optimization**: Specialized gas optimization recommendations
- **Etherscan Integration**: Instant verification on Sepolia Etherscan

### Comprehensive Development Tools

- **Security-First Architecture**
  - Comprehensive event emissions for transparency
  - Strong access control mechanisms
  - Runtime integrity validation
  - Ethereum-specific performance optimizations
  

### AI-Powered Documentation & Testing
- **Comprehensive Documentation Generator**: AI-generated technical documentation with architecture analysis
- **Multi-Framework Test Generation**: Automated test suite creation for Hardhat, Foundry, and Remix
- **RAG-Enhanced Context**: Leverages similar contract patterns for better documentation quality

### Immutable On-Chain Verification
- **Permanent Audit Records**: All assessments stored immutably on Sepolia testnet
- **Transparent History**: Complete traceability of security evaluations
- **Verifiable Security Ratings**: Standardized 5-star scoring system for objective comparison
- **Public Verification**: Direct Etherscan links for transparency

![On-Chain Verification](https://github.com/user-attachments/assets/e90ec881-4015-4514-b7e3-81b703ee7238)
![Audit Dashboard](https://github.com/user-attachments/assets/006d80fb-3708-4d7e-856c-3d99465440df)
![Profile Management](https://github.com/user-attachments/assets/61b7af95-ab90-41a9-b15a-17bd3f037475)

### Developer Experience
- **Interactive Development**: Real-time code analysis with instant feedback
- **Documentation Generation**: Automatic creation of comprehensive contract documentation
- **Test Suite Creation**: AI-generated test suites for multiple frameworks
- **Responsive Interface**: Modern UI with reactive network connection status using RainbowKit

![Developer Interface](https://github.com/user-attachments/assets/6906bebc-3d13-4783-b037-ed2c7bfb84fa)
![Documentation Generator](https://github.com/user-attachments/assets/e57c798a-44a8-493f-b4ef-aedd9142c7d0)

## 📊 Security Rating System

<div align="left">

Our intuitive star-based rating system makes contract security transparent and accessible:

| Rating | Status | Description |
|:------:|:------:|-------------|
| ⭐⭐⭐⭐⭐ | **PERFECT** | Zero vulnerabilities, fully optimized for Ethereum |
| ⭐⭐⭐⭐ | **SECURE** | No critical issues, minor optimizations needed |
| ⭐⭐⭐ | **GOOD** | No critical but has high severity issues |
| ⭐⭐ | **RISKY** | Critical vulnerability or multiple high severity issues |
| ⭐ | **DANGEROUS** | Multiple critical and high severity vulnerabilities |
| 0 | **FATAL** | Fundamental security flaws, deployment not recommended |

</div>

## 🚀 Getting Started

### Prerequisites
- MetaMask or compatible Web3 wallet
- Access to Sepolia Testnet
- Sepolia ETH tokens for audit verification (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/dappauditor.git
cd dappauditor
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

Add your API keys:
```env
NEXT_PUBLIC_MISTRAL_API_KEY=your_mistral_api_key
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_google_ai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=dappauditor-contracts
# Optional: For enhanced analysis with fine-tuned model
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

4. Initialize the vector database (optional, for enhanced RAG features)
```bash
npm run init-pinecone
```

5. Run the development server
```bash
npm run dev
```

## 🔧 Tech Stack

<div align="left">
  <table>
    <tr>
      <td align="center"><b>Frontend</b></td>
      <td align="center"><b>Blockchain</b></td>
      <td align="center"><b>AI Engine</b></td>
    </tr>
    <tr>
      <td>
        <ul>
          <li>Next.js 15</li>
          <li>TypeScript</li>
          <li>Tailwind CSS</li>
          <li>Framer Motion</li>
        </ul>
      </td>
      <td>
        <ul>
          <li>ethers.js v6</li>
          <li>Wagmi v2</li>
          <li>RainbowKit</li>
          <li>Sepolia Testnet</li>
          <li>Solidity Compiler</li>
        </ul>
      </td>
      <td>
        <ul>
          <li>Mistral AI (Large)</li>
          <li>Google Embeddings API</li>
          <li>Pinecone Vector DB</li>
          <li>RAG Enhancement</li>
          <li>Zod Validation</li>
          <li>Optional: Custom Llama-2</li>
        </ul>
      </td>
    </tr>
  </table>
</div>

## 🌐 Features Overview

### 🔍 Smart Contract Audit
- **AI-powered vulnerability detection** using Mistral AI for comprehensive analysis
- **Comprehensive security analysis** with 5-star rating system
- **Gas optimization recommendations** specific to Ethereum
- **On-chain audit registration** with immutable verification on Sepolia
- **Mock analysis mode** for testing and demonstration

### 📚 Documentation Generator
- Comprehensive technical documentation
- Architecture analysis and design patterns
- Function-by-function breakdown
- Export to Markdown format

### 🧪 Test Suite Generator
- Multi-framework support (Hardhat, Foundry, Remix)
- Vulnerability-specific test cases
- Edge case coverage
- Best practices implementation

### 📊 Profile Dashboard
- Personal audit history
- Security statistics
- On-chain verification status
- Cross-contract analytics

## 🧠 AI Architecture & Optional Fine-tuned Model

DappAuditor's primary AI analysis is powered by **Mistral AI** with optional integration of a custom fine-tuned model:

### Primary AI Engine
- **Mistral AI Large**: Advanced language model for comprehensive vulnerability detection
- **JSON-structured responses** with Zod validation for reliability
- **Context-aware analysis** with smart fallback mechanisms
- **Real-time vulnerability classification** with severity scoring

### Optional Fine-tuned Enhancement
For users seeking additional specialized analysis, we've developed:

**Custom Llama-2-7b Model**: `audicarkey/llama2-smart-contract-vulnerability-detector`

#### Model Specifications
- **Base Model**: NousResearch/Llama-2-7b-chat-hf
- **Training Method**: QLoRA (Quantized Low-Rank Adaptation)
- **Training Dataset**: 3,000+ smart contract examples with vulnerability patterns
- **Specialized Detection**: Common vulnerability types including:
  - Reentrancy attacks
  - Integer overflow/underflow
  - Access control issues
  - Unchecked external calls
  - Gas limit vulnerabilities

#### Training Configuration
- **LoRA Parameters**: Rank 32, Alpha 64, Dropout 0.05
- **Training Setup**: 3 epochs, cosine learning rate scheduling
- **Optimization**: 4-bit quantization with BitsAndBytesConfig
- **Memory Efficiency**: Gradient checkpointing for Colab compatibility

### Current Implementation
The live application uses:
```javascript
// Primary: Mistral AI analysis
const mistralClient = new Mistral({
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY
});

// With mock fallback for demonstration
const generateMockAnalysis = (code) => {
  // Comprehensive mock analysis for testing
};
```

## 🌐 Live Demo

<div align="center">
  
### [🚀 Launch DappAuditor →](https://your-deployment-url.vercel.app/)

*Experience the future of smart contract security on Sepolia Testnet*
  
</div>

## 🏗️ Architecture

```
DappAuditor/
├── src/
│   ├── app/                    # Next.js 15 app directory
│   │   ├── audit/             # Security audit interface
│   │   ├── documentor/        # Documentation generator
│   │   ├── testcase-generator/# Test suite generator
│   │   ├── reports/           # Audit reports dashboard
│   │   └── profile/           # User profile & stats
│   ├── components/            # Reusable UI components
│   ├── providers/             # Context providers (RainbowKit)
│   ├── utils/                 # Utility functions
│   │   ├── vectorStore.ts     # Pinecone integration
│   │   ├── web3.ts           # Blockchain utilities
│   │   └── contracts.ts      # Contract definitions
│   └── scripts/              # Initialization scripts
└── public/                   # Static assets
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🔬 Research & Fine-tuning Work

This project includes experimental research into AI-powered smart contract analysis:

### Fine-tuning Research
We've developed a custom fine-tuned model as part of our research into specialized vulnerability detection:

**Training Infrastructure**
- **Platform**: Google Colab (optimized for free tier)
- **Memory Management**: Gradient checkpointing, 4-bit quantization
- **Training Time**: ~3-4 hours on Colab T4 GPU
- **Final Model Size**: ~2.7GB (quantized)

**Dataset & Training**
- **Base Model**: NousResearch/Llama-2-7b-chat-hf
- **Training Examples**: 3,000+ processed smart contract samples
- **Format**: Llama-2 instruction format with vulnerability analysis prompts
- **Validation**: Manual testing on known vulnerability patterns

**Training Script Features**
```python
# Key training parameters from our script
lora_r = 32
lora_alpha = 64  
lora_dropout = 0.05
num_train_epochs = 3
max_seq_length = 1024
per_device_train_batch_size = 1
gradient_accumulation_steps = 4
```

### Model Availability & Usage
The research model is available on Hugging Face:
- **🤗 Repository**: [audicarkey/llama2-smart-contract-vulnerability-detector](https://huggingface.co/audicarkey/llama2-smart-contract-vulnerability-detector)
- **Usage**: Can be integrated as an alternative analysis engine
- **Status**: Experimental/Research - Mistral AI remains the primary production engine

### Integration Potential
```python
# Example integration (not currently in production)
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# Load fine-tuned model for enhanced analysis
base_model = AutoModelForCausalLM.from_pretrained("NousResearch/Llama-2-7b-chat-hf")
model = PeftModel.from_pretrained(base_model, "audicarkey/llama2-smart-contract-vulnerability-detector")
```

### Training Resources
The complete training notebook is available:
- **Script**: `Llama_2_Finetuning_Script_for_Smart_Contract_Vulnerability_Analysis.ipynb`
- **Features**: Interactive testing, model upload to Hugging Face
- **Compatibility**: Designed for Google Colab free tier

- **Mistral AI** for powerful language model capabilities
- **Ethereum Foundation** for Sepolia testnet infrastructure
- **Pinecone** for vector database technology
- **RainbowKit** for seamless wallet integration

---
