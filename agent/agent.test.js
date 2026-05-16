const { runAgent } = require('./agent');
const { planAction } = require('./planner');
const { execute } = require('./executor');

// Mock the dependencies
jest.mock('./planner');
jest.mock('./executor');

describe('agent.js - runAgent', () => {
  // Store original console methods
  let originalConsoleLog;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock console.log to avoid cluttering test output
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });

  describe('Basic Functionality', () => {
    it('should call planAction with user input', async () => {
      // Arrange
      const userInput = 'Generate unit tests for agent.js';
      const mockPlan = {
        tool: 'read_file',
        target: 'agent/agent.js',
        instruction: userInput,
        taskType: 'test'
      };
      const mockResult = 'Test generation complete';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      await runAgent(userInput);

      // Assert
      expect(planAction).toHaveBeenCalledWith(userInput);
      expect(planAction).toHaveBeenCalledTimes(1);
    });

    it('should call execute with the plan from planAction', async () => {
      // Arrange
      const userInput = 'Create a new file';
      const mockPlan = {
        tool: 'write_file',
        target: 'test.js',
        instruction: userInput,
        taskType: 'code'
      };
      const mockResult = 'File created successfully';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      await runAgent(userInput);

      // Assert
      expect(execute).toHaveBeenCalledWith(mockPlan);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('should return the result from execute', async () => {
      // Arrange
      const userInput = 'List all files';
      const mockPlan = {
        tool: 'list_files',
        target: '.',
        instruction: userInput,
        taskType: 'code'
      };
      const mockResult = 'Files listed successfully';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
    });

    it('should execute planAction and execute in sequence', async () => {
      // Arrange
      const userInput = 'Run tests';
      const mockPlan = {
        tool: 'run_command',
        target: 'npm test',
        instruction: userInput,
        taskType: 'test'
      };
      const mockResult = 'Tests executed';
      const executionOrder = [];

      planAction.mockImplementation(async (input) => {
        executionOrder.push('plan');
        return mockPlan;
      });

      execute.mockImplementation(async (plan) => {
        executionOrder.push('execute');
        return mockResult;
      });

      // Act
      await runAgent(userInput);

      // Assert
      expect(executionOrder).toEqual(['plan', 'execute']);
    });
  });

  describe('Console Output', () => {
    it('should log "Thinking..." message', async () => {
      // Arrange
      const userInput = 'Test input';
      const mockPlan = { tool: 'list_files', target: '.', taskType: 'code' };
      const mockResult = 'Result';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      await runAgent(userInput);

      // Assert
      expect(console.log).toHaveBeenCalledWith('\x1b[90mThinking...\x1b[0m');
    });

    it('should log the plan with tool and target', async () => {
      // Arrange
      const userInput = 'Test input';
      const mockPlan = {
        tool: 'read_file',
        target: 'test.js',
        taskType: 'review'
      };
      const mockResult = 'Result';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      await runAgent(userInput);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        `\x1b[90mPlan: ${mockPlan.tool} → ${mockPlan.target}\x1b[0m`
      );
    });

    it('should log console messages in correct order', async () => {
      // Arrange
      const userInput = 'Test input';
      const mockPlan = {
        tool: 'write_file',
        target: 'output.js',
        taskType: 'code'
      };
      const mockResult = 'Result';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      await runAgent(userInput);

      // Assert
      expect(console.log).toHaveBeenNthCalledWith(1, '\x1b[90mThinking...\x1b[0m');
      expect(console.log).toHaveBeenNthCalledWith(
        2,
        `\x1b[90mPlan: ${mockPlan.tool} → ${mockPlan.target}\x1b[0m`
      );
    });
  });

  describe('Different Tool Types', () => {
    it('should handle read_file tool', async () => {
      // Arrange
      const userInput = 'Read agent.js';
      const mockPlan = {
        tool: 'read_file',
        target: 'agent/agent.js',
        instruction: userInput,
        taskType: 'review'
      };
      const mockResult = 'File content';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle write_file tool', async () => {
      // Arrange
      const userInput = 'Create new file';
      const mockPlan = {
        tool: 'write_file',
        target: 'new-file.js',
        instruction: userInput,
        taskType: 'code'
      };
      const mockResult = 'File written';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle list_files tool', async () => {
      // Arrange
      const userInput = 'List all files';
      const mockPlan = {
        tool: 'list_files',
        target: '.',
        instruction: userInput,
        taskType: 'code'
      };
      const mockResult = 'File list';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle run_command tool', async () => {
      // Arrange
      const userInput = 'Run npm test';
      const mockPlan = {
        tool: 'run_command',
        target: 'npm test',
        instruction: userInput,
        taskType: 'test'
      };
      const mockResult = 'Command output';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });
  });

  describe('Different Task Types', () => {
    it('should handle test task type', async () => {
      // Arrange
      const userInput = 'Generate unit tests';
      const mockPlan = {
        tool: 'read_file',
        target: 'agent.js',
        instruction: userInput,
        taskType: 'test'
      };
      const mockResult = 'Tests generated';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle documentation task type', async () => {
      // Arrange
      const userInput = 'Add JSDoc comments';
      const mockPlan = {
        tool: 'read_file',
        target: 'agent.js',
        instruction: userInput,
        taskType: 'documentation'
      };
      const mockResult = 'Documentation added';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle review task type', async () => {
      // Arrange
      const userInput = 'Review code quality';
      const mockPlan = {
        tool: 'read_file',
        target: 'agent.js',
        instruction: userInput,
        taskType: 'review'
      };
      const mockResult = 'Review complete';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle fix task type', async () => {
      // Arrange
      const userInput = 'Fix the bug';
      const mockPlan = {
        tool: 'read_file',
        target: 'agent.js',
        instruction: userInput,
        taskType: 'fix'
      };
      const mockResult = 'Bug fixed';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle code task type', async () => {
      // Arrange
      const userInput = 'Create a function';
      const mockPlan = {
        tool: 'write_file',
        target: 'utils.js',
        instruction: userInput,
        taskType: 'code'
      };
      const mockResult = 'Code created';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from planAction', async () => {
      // Arrange
      const userInput = 'Test input';
      const error = new Error('Planning failed');

      planAction.mockRejectedValue(error);

      // Act & Assert
      await expect(runAgent(userInput)).rejects.toThrow('Planning failed');
    });

    it('should propagate errors from execute', async () => {
      // Arrange
      const userInput = 'Test input';
      const mockPlan = {
        tool: 'read_file',
        target: 'test.js',
        taskType: 'code'
      };
      const error = new Error('Execution failed');

      planAction.mockResolvedValue(mockPlan);
      execute.mockRejectedValue(error);

      // Act & Assert
      await expect(runAgent(userInput)).rejects.toThrow('Execution failed');
    });

    it('should not call execute if planAction fails', async () => {
      // Arrange
      const userInput = 'Test input';
      const error = new Error('Planning failed');

      planAction.mockRejectedValue(error);

      // Act & Assert
      try {
        await runAgent(userInput);
      } catch (e) {
        // Expected to throw
      }

      expect(execute).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user input', async () => {
      // Arrange
      const userInput = '';
      const mockPlan = {
        tool: 'list_files',
        target: '.',
        taskType: 'code'
      };
      const mockResult = 'Result';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(planAction).toHaveBeenCalledWith('');
    });

    it('should handle very long user input', async () => {
      // Arrange
      const userInput = 'a'.repeat(10000);
      const mockPlan = {
        tool: 'list_files',
        target: '.',
        taskType: 'code'
      };
      const mockResult = 'Result';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(planAction).toHaveBeenCalledWith(userInput);
    });

    it('should handle special characters in user input', async () => {
      // Arrange
      const userInput = 'Test with special chars: @#$%^&*()';
      const mockPlan = {
        tool: 'list_files',
        target: '.',
        taskType: 'code'
      };
      const mockResult = 'Result';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(planAction).toHaveBeenCalledWith(userInput);
    });

    it('should handle plan with missing optional fields', async () => {
      // Arrange
      const userInput = 'Test input';
      const mockPlan = {
        tool: 'list_files',
        target: '.'
        // Missing instruction and taskType
      };
      const mockResult = 'Result';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(mockResult);
      expect(execute).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle empty result from execute', async () => {
      // Arrange
      const userInput = 'Test input';
      const mockPlan = {
        tool: 'list_files',
        target: '.',
        taskType: 'code'
      };
      const mockResult = '';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe('');
    });

    it('should handle null result from execute', async () => {
      // Arrange
      const userInput = 'Test input';
      const mockPlan = {
        tool: 'list_files',
        target: '.',
        taskType: 'code'
      };
      const mockResult = null;

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(result).toBe(null);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow for test generation', async () => {
      // Arrange
      const userInput = 'Generate unit tests for agent.js';
      const mockPlan = {
        tool: 'read_file',
        target: 'agent/agent.js',
        instruction: userInput,
        taskType: 'test'
      };
      const mockResult = '// Generated test code...';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(planAction).toHaveBeenCalledWith(userInput);
      expect(execute).toHaveBeenCalledWith(mockPlan);
      expect(result).toBe(mockResult);
      expect(console.log).toHaveBeenCalledWith('\x1b[90mThinking...\x1b[0m');
      expect(console.log).toHaveBeenCalledWith(
        `\x1b[90mPlan: ${mockPlan.tool} → ${mockPlan.target}\x1b[0m`
      );
    });

    it('should handle complete workflow for file creation', async () => {
      // Arrange
      const userInput = 'Create a new utility file';
      const mockPlan = {
        tool: 'write_file',
        target: 'utils/helper.js',
        instruction: userInput,
        taskType: 'code'
      };
      const mockResult = 'File created successfully';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(planAction).toHaveBeenCalledWith(userInput);
      expect(execute).toHaveBeenCalledWith(mockPlan);
      expect(result).toBe(mockResult);
    });

    it('should handle complete workflow for command execution', async () => {
      // Arrange
      const userInput = 'Run npm test';
      const mockPlan = {
        tool: 'run_command',
        target: 'npm test',
        instruction: userInput,
        taskType: 'test'
      };
      const mockResult = 'All tests passed';

      planAction.mockResolvedValue(mockPlan);
      execute.mockResolvedValue(mockResult);

      // Act
      const result = await runAgent(userInput);

      // Assert
      expect(planAction).toHaveBeenCalledWith(userInput);
      expect(execute).toHaveBeenCalledWith(mockPlan);
      expect(result).toBe(mockResult);
    });
  });
});

// Made with Bob
