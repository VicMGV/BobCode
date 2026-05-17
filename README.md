# 🤖 Bob Agent - AI-Powered CLI Coding Assistant

An intelligent CLI agent powered by IBM Bob that helps you generate tests, documentation, and code with best practices built-in.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

- 🧪 **Test Generation** - Comprehensive unit tests with Node.js test runner
- 📚 **Documentation** - JSDoc comments, README files, and API documentation
- 💻 **Code Generation** - Production-quality code following SOLID principles
- 🔍 **Code Review** - Analyze code quality and suggest improvements
- 🛠️ **Bug Fixing** - Debug and fix issues with AI assistance
- 🔒 **Security First** - Built-in path traversal protection and command injection prevention
- ⚡ **Smart Planning** - Hybrid AI + local detection for accurate task understanding
- 🔄 **Retry Logic** - Automatic retry with exponential backoff for API calls

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
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
- npm or yarn
- IBM Bob API credentials (optional - works in mock mode without)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/VicMGV/BobCode.git
   cd BobCode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your Bob API credentials
   ```

4. **Start the agent**
   ```bash
   npm start
   ```

## ⚡ Quick Start

```bash
# Start the interactive CLI
npm start

# Example commands:
> generate tests for index.js
> add JSDoc comments to agent/planner.js
> create a new authentication module
> review the code in tools/read_file.js
> fix the bug in agent/executor.js
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Bob API Configuration
BOB_API_URL=https://api.bob.example.com/v1/chat
BOB_API_KEY=your_api_key_here

# Optional Configuration
NODE_ENV=development
LOG_LEVEL=info
```

### Security Configuration

Edit `config/security.js` to customize:

- File size limits
- Allowed commands
- API timeout and retry settings
- Rate limiting
- Path validation rules

## 📖 Usage Examples

### Generate Tests

```bash
> generate tests for utils.js
```

The agent will:
1. Read the target file
2. Analyze the code structure
3. Generate comprehensive tests with:
   - Happy path scenarios
   - Edge cases
   - Error handling
   - Type validation

### Add Documentation

```bash
> add JSDoc to all functions in api.js
```

Generates complete JSDoc with:
- Function descriptions
- Parameter types and descriptions
- Return value documentation
- Usage examples
- Error documentation

### Create New Code

```bash
> create a user authentication service
```

Generates production-ready code with:
- Input validation
- Error handling
- Security best practices
- SOLID principles
- Comprehensive comments

### Review Code

```bash
> review the code in app.js
```

Provides analysis of:
- Code quality
- Best practices
- Performance issues
- Security vulnerabilities
- Refactoring opportunities

## 🏗️ Architecture

```
bob-agent/
├── agent/              # Core agent logic
│   ├── agent.js       # Main agent orchestrator
│   ├── planner.js     # Task planning and detection
│   └── executor.js    # Task execution
├── bob/               # Bob API integration
│   ├── client.js      # API client with retry logic
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

```

### Component Overview

- **Agent**: Orchestrates task planning and execution
- **Planner**: Detects task type and selects appropriate tools
- **Executor**: Runs tools and generates output using specialized prompts
- **Tools**: Secure file operations and command execution
- **Bob Client**: API integration with retry logic and rate limiting

## 🔒 Security

### Built-in Security Features

✅ **Path Traversal Protection**
- Validates all file paths
- Restricts access to project directory
- Blocks suspicious patterns

✅ **Command Injection Prevention**
- Whitelist of allowed commands
- Input sanitization
- Pattern detection for dangerous operations

✅ **Input Validation**
- Type checking
- Size limits
- Content validation

✅ **Rate Limiting**
- Prevents API abuse
- Configurable limits
- Per-window tracking

✅ **Error Handling**
- Global error handlers
- Graceful degradation
- User-friendly error messages

### Security Best Practices

1. **Never run with elevated privileges**
2. **Review generated code before execution**
3. **Keep API keys secure** (use environment variables)
4. **Regularly update dependencies**
5. **Monitor logs for suspicious activity**

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for tests
npm run test:watch
```

### Project Scripts

- `npm start` - Start the CLI agent
- `npm run dev` - Development mode with auto-reload
- `npm test` - Run test suite
- `npm run test:coverage` - Generate coverage report
- `npm run test:watch` - Watch mode for tests

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

Current coverage: ~60%
Target: 80%+

Coverage reports are generated in the `coverage/` directory.

### Writing Tests

Tests use Node.js built-in test runner:

```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('MyFunction', () => {
  test('should handle valid input', () => {
    const result = myFunction('valid');
    assert.strictEqual(result, 'expected');
  });
});
```

## 📊 Performance

- **Async Operations**: All file operations are asynchronous
- **Rate Limiting**: Prevents API overload
- **Retry Logic**: Exponential backoff for failed requests
- **Timeout Handling**: Prevents hanging operations
- **Memory Limits**: File size restrictions

## 🐛 Troubleshooting

### Common Issues

**Issue**: "No API key configured"
- **Solution**: Add `BOB_API_KEY` to `.env` file or run in mock mode

**Issue**: "Command not allowed"
- **Solution**: Check `config/security.js` for allowed commands

**Issue**: "Access denied: path outside project"
- **Solution**: Ensure file paths are within the project directory

**Issue**: "Rate limit exceeded"
- **Solution**: Wait or adjust rate limits in `config/security.js`

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=debug npm start
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- Use ESLint for linting
- Follow existing code patterns
- Add JSDoc comments for functions
- Write tests for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- IBM Bob for the AI capabilities
- Node.js community for excellent tools
- All contributors who help improve this project

## 📞 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/bob-agent/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/bob-agent/discussions)

## 🗺️ Roadmap

- [ ] Web interface
- [ ] VS Code extension
- [ ] Multi-language support
- [ ] Custom prompt templates
- [ ] Plugin system
- [ ] Cloud deployment options

---
