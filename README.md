# 🤖 Bob Agent - AI-Powered CLI Coding Assistant

An intelligent CLI agent powered by IBM Bob and watsonx.ai that helps you generate tests, documentation, and code with best practices built-in.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

- 🧪 *Test Generation* - Comprehensive unit tests with edge cases
- 📚 *Documentation* - JSDoc comments, README files, and API documentation
- 💻 *Code Generation* - Production-quality code following SOLID principles
- 🔍 *Code Review* - Structured JSON feedback with severity levels
- 🛠️ *Bug Fixing* - Debug and fix issues with AI assistance
- 🔒 *Security First* - Path traversal protection and command injection prevention
- ⚡ *Smart Planning* - Hybrid AI + local detection for accurate task understanding
- 🔄 *Retry Logic* - Automatic retry with exponential backoff for API calls

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Getting API Credentials](#getting-api-credentials)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Security](#security)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Installation

### Prerequisites

- Node.js >= 16.0.0
- pnpm
- IBM watsonx.ai credentials (optional - works in mock mode without)

### Steps

1. *Clone the repository*
   
   bash
   git clone https://github.com/VicMGV/BobCode.git
   cd BobCode
   
1. *Install dependencies*
   
   bash
   pnpm install
   
1. *Configure environment variables*
   
   bash
   cp .env.example .env
   # Edit .env and add your watsonx.ai credentials
   
1. *Start the agent*
   
   bash
   pnpm start
   

## ⚡ Quick Start

bash
# Start the interactive CLI
pnpm start

# Example commands:
> generate tests for index.js
> add JSDoc comments to agent/planner.js
> create a new authentication module
> review the code in tools/read_file.js
> fix the bug in agent/executor.js


## 🔑 Getting API Credentials

Bob Agent uses *IBM watsonx.ai* for AI inference. Follow these steps to get your credentials:

### Step 1 — Create an IBM Cloud Account

1. Go to <https://cloud.ibm.com>
1. Sign up or log in with your IBMid
1. If you are participating in the IBM Bob Hackathon, request your provisioned account at:
   
   
   https://www.ibm.com/account/reg/us-en/signup?formid=urx-54370
   

### Step 2 — Access watsonx.ai

1. Log in to <https://cloud.ibm.com>
1. In the top menu, click *Navigation menu (☰) → Resource list*
1. Expand the *AI / Machine Learning* section
1. Click on your *watsonx.ai Studio* instance
1. Click *Launch watsonx.ai* or go directly to:
   
   
   https://dataplatform.cloud.ibm.com/login?context=wx
   
1. Make sure the region is set to *Dallas (us-south)*

### Step 3 — Get your Project ID

1. On the watsonx.ai home page, scroll down to the *Developer access* section
1. In the *Project or deployment space* dropdown, select your project (e.g. watsonx Hackathon Sandbox)
1. Copy the *Project ID* shown — you will need this for your .env

### Step 4 — Create an API Key

1. In IBM Cloud, go to *Manage → Access (IAM) → API Keys*
1. Click *Create an IBM Cloud API key*
1. Give it a name (e.g. watsonx-bob-agent-key)
1. Select *Disable the leaked key* option
1. Click *Create*
1. *Copy the API key immediately* — it will only be shown once

> ⚠️ *Security Warning:* Never commit your API key to GitHub. Always store it in your .env file which must be listed in .gitignore.

### Step 5 — Configure your .env

env
WATSONX_API_KEY=your_api_key_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_MODEL=ibm/granite-3-8b-instruct
NODE_ENV=development
LOG_LEVEL=info


## ⚙️ Configuration

### Environment Variables

|Variable            |Required|Description                                     |
|--------------------|--------|------------------------------------------------|
|WATSONX_API_KEY   |Yes     |IBM Cloud API key for watsonx.ai authentication |
|WATSONX_URL       |Yes     |watsonx.ai endpoint URL (default: us-south)     |
|WATSONX_PROJECT_ID|Yes     |Your watsonx.ai project ID                      |
|WATSONX_MODEL     |No      |AI model to use (default: granite-3-8b-instruct)|
|NODE_ENV          |No      |Environment mode (development/production/test)  |
|LOG_LEVEL         |No      |Logging level (error/warn/info/debug)           |


> If no credentials are provided, Bob Agent runs in *mock mode* automatically.

### Security Configuration

Edit config/security.js to customize:

- File size limits
- Allowed commands
- API timeout and retry settings
- Rate limiting
- Path validation rules

## 📖 Usage Examples

### Generate Tests

bash
> generate tests for utils.js


The agent will:

1. Read the target file
1. Analyze the code structure
1. Generate comprehensive Jest tests with edge cases and error handling

### Add Documentation

bash
> add JSDoc to all functions in api.js


Generates complete JSDoc with parameter types, return values, and usage examples.

### Create New Code

bash
> create a user authentication service


Generates production-ready code with input validation, error handling, and SOLID principles.

### Review Code

bash
> review the code in app.js


Returns structured JSON feedback with severity levels:

- minor — style and documentation suggestions
- warning — potential bugs or testability issues
- info — performance and dependency recommendations

## 🏗️ Architecture


bob-agent/
├── agent/              # Core agent logic
│   ├── agent.js       # Main agent orchestrator
│   ├── planner.js     # Task planning and detection
│   └── executor.js    # Task execution
├── bob/               # watsonx.ai integration
│   ├── client.js      # API client with IAM auth + retry logic
│   └── prompts.js     # Specialized prompts
├── tools/             # File and command tools
│   ├── read_file.js   # Secure file reading
│   ├── write_file.js  # Secure file writing
│   ├── list_files.js  # Directory listing
│   └── run_command.js # Command execution
├── cli/               # CLI interface
│   └── interface.js   # Interactive prompt
├── config/            # Configuration
│   └── security.js    # Security settings
└── index.js           # Entry point


### Component Overview

- *Agent*: Orchestrates task planning and execution
- *Planner*: Detects task type and selects appropriate tools
- *Executor*: Runs tools and generates output using specialized prompts
- *Tools*: Secure file operations and command execution
- *Bob Client*: watsonx.ai integration with automatic IAM token management, retry logic, and rate limiting

## 🔒 Security

### Built-in Security Features

✅ *Path Traversal Protection* — Validates all file paths, restricts access to project directory

✅ *Command Injection Prevention* — Whitelist of allowed commands, input sanitization

✅ *Input Validation* — Type checking, size limits, content validation

✅ *Rate Limiting* — 60 requests/60 seconds with sliding window algorithm

✅ *Retry + Exponential Backoff* — Maximum 3 retries with random jitter

✅ *Structured Logging* — Winston logger with severity levels, no sensitive data exposure

### Security Best Practices

1. Never run with elevated privileges
1. Review generated code before execution
1. Keep API keys in .env — never commit to Git
1. Regularly update dependencies
1. Monitor logs for suspicious activity

## 🛠️ Development

bash
pnpm install        # Install dependencies
pnpm dev            # Development mode with auto-reload
pnpm test           # Run test suite
pnpm test:coverage  # Generate coverage report
pnpm test:watch     # Watch mode for tests


## 🧪 Testing

Current coverage: ~60% | Target: 80%+

bash
pnpm test
pnpm test:coverage


## 🗺️ Roadmap

- [ ] Web interface
- [ ] VS Code extension
- [ ] Multi-language support
- [ ] Custom prompt templates
- [ ] Plugin system
- [ ] Cloud deployment options

## 🙏 Acknowledgments

- IBM Bob for the AI capabilities
- IBM watsonx.ai and the Granite model
- Node.js community for excellent tools

## 📝 License

This project is licensed under the MIT License - see the <LICENSE> file for details.
