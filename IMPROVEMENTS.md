# Prompt Improvements Documentation

## Overview
This document details the comprehensive improvements made to the CLI coding agent's prompts to enhance precision, effectiveness, and output quality for test generation, documentation, and code writing tasks.

## Summary of Changes

### 1. Enhanced PLANNER_PROMPT
**File:** `bob/prompts.js`

**Key Improvements:**
- ✅ **Task Type Detection**: Automatically identifies user intent (test, documentation, code, review, fix)
- ✅ **Tool Selection Logic**: Clear rules for when to use each tool
- ✅ **Multi-step Task Handling**: Guides the planner to choose the first step in complex workflows
- ✅ **JSON Schema Validation**: Strict output format with validation rules
- ✅ **Contextual Examples**: Provides concrete examples for common scenarios

**Before:**
```javascript
const PLANNER_PROMPT = (userInput) => `
PLANNER: Analyze the following user instruction and decide which tool to use.
Instruction: "${userInput}"
Available tools: read_file, write_file, list_files, run_command
Respond ONLY with valid JSON, no extra text:
{ "tool": "tool_name", "target": "file_or_path", "instruction": "detailed instruction" }
`;
```

**After:**
- 60+ lines of detailed guidance
- Task type categorization (test/documentation/code/review/fix)
- Tool selection logic with decision trees
- Multi-step task handling
- Validation rules and examples

### 2. Specialized TEST_GENERATION_PROMPT
**Priority Focus:** High-quality, comprehensive unit tests

**Key Features:**
- ✅ **Node.js Built-in Test Runner**: Optimized for `node:test` module
- ✅ **Comprehensive Coverage Requirements**: Happy path, edge cases, error handling
- ✅ **Assertion Best Practices**: Specific guidance on using assert methods
- ✅ **Test Structure Standards**: AAA pattern, describe blocks, naming conventions
- ✅ **Edge Case Checklist**: Empty values, null, undefined, boundary testing
- ✅ **Quality Checklist**: 10-point validation for test quality

**Coverage Requirements:**
1. Happy Path - Expected behavior with valid inputs
2. Edge Cases - Boundary values, empty inputs, null, undefined
3. Error Handling - Invalid inputs, exceptions, error messages
4. Type Validation - Wrong types (string vs number, etc.)
5. Async Operations - Promises, async/await, callbacks
6. Integration Points - Interactions with other modules

**Example Output Structure:**
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('FunctionName', () => {
  describe('Happy Path', () => {
    test('should return expected result with valid input', () => {
      // Test implementation
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      // Test implementation
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid type', () => {
      // Test implementation
    });
  });
});
```

### 3. DOCUMENTATION_PROMPT
**Purpose:** Generate professional JSDoc, README, and inline comments

**Key Features:**
- ✅ **JSDoc Standards**: Complete format with @param, @returns, @throws, @example
- ✅ **README Structure**: Project overview, installation, usage, API reference
- ✅ **Inline Comment Guidelines**: Explain WHY, not WHAT
- ✅ **Quality Checklist**: 9-point validation for documentation quality

**JSDoc Template:**
```javascript
/**
 * Brief description of what the function does
 * 
 * Detailed explanation if needed
 * 
 * @param {Type} paramName - Description of parameter
 * @param {Type} [optionalParam] - Optional parameter description
 * @returns {Type} Description of return value
 * @throws {ErrorType} When and why this error is thrown
 * @example
 * // Example usage
 * const result = functionName(arg1, arg2);
 */
```

### 4. CODE_GENERATION_PROMPT
**Purpose:** Generate production-quality, maintainable code

**Key Features:**
- ✅ **SOLID Principles**: Single responsibility, DRY, KISS, YAGNI
- ✅ **JavaScript Best Practices**: const/let, async/await, destructuring
- ✅ **Error Handling Requirements**: Input validation, try-catch, descriptive errors
- ✅ **Security Considerations**: Input sanitization, no eval(), safe file operations
- ✅ **Performance Guidelines**: Efficient algorithms, appropriate data structures
- ✅ **Quality Checklist**: 10-point validation for code quality

**Code Structure Pattern:**
```javascript
function functionName(param1, param2) {
  // 1. Input validation
  if (!param1) throw new TypeError('param1 is required');
  
  // 2. Early returns for edge cases
  if (param2 === 0) return defaultValue;
  
  // 3. Main logic
  const result = processLogic(param1, param2);
  
  // 4. Return result
  return result;
}
```

### 5. CODE_REVIEW_PROMPT
**Purpose:** Analyze code quality and provide actionable feedback

**Review Categories:**
1. Code Quality - Readability, maintainability, structure
2. Best Practices - Language idioms, patterns, conventions
3. Performance - Efficiency, optimization opportunities
4. Security - Vulnerabilities, input validation
5. Error Handling - Exception handling, edge cases
6. Testing - Testability, test coverage gaps
7. Documentation - Comments, JSDoc, clarity

**Output Format:**
- Summary
- Critical Issues 🔴
- Warnings ⚠️
- Suggestions 💡
- Positive Aspects ✅
- Refactoring Opportunities

### 6. Enhanced Planner Logic
**File:** `agent/planner.js`

**New Functions:**
1. **`detectTaskType(userInput)`**
   - Analyzes keywords to identify task intent
   - Returns: test, documentation, code, review, or fix
   - Keywords: test/tests/testing → 'test', document/jsdoc → 'documentation', etc.

2. **`detectTool(userInput)`**
   - Determines appropriate tool based on user input
   - Extracts file paths using regex
   - Returns: { tool, target }
   - Handles: run_command, list_files, read_file, write_file

3. **`planAction(userInput)` - Enhanced**
   - Combines local detection with AI planning
   - Validates AI response against known tools/task types
   - Falls back to local detection if AI fails
   - Returns: { tool, target, instruction, taskType }

**Hybrid Approach:**
- Local keyword detection for common patterns (fast, reliable)
- AI planning for complex scenarios (flexible, intelligent)
- Validation and fallback mechanisms (robust, error-resistant)

### 7. Updated Executor
**File:** `agent/executor.js`

**Changes:**
- Now uses `getExecutorPrompt(taskType, instruction, context)`
- Selects appropriate specialized prompt based on taskType
- Maintains backward compatibility with fallback to CODE_GENERATION_PROMPT

## Benefits

### Precision
- Task-specific prompts produce more accurate results
- Clear intent detection reduces ambiguity
- Specialized guidance for each task type

### Quality
- Built-in best practices and standards
- Comprehensive checklists ensure completeness
- Examples demonstrate expected output format

### Consistency
- Standardized output formats across all task types
- Predictable structure for tests, docs, and code
- Uniform quality standards

### Maintainability
- Clear separation of concerns (planner vs executor)
- Modular prompt structure (easy to update individual prompts)
- Well-documented code with JSDoc comments

### Extensibility
- Easy to add new task types
- Simple to customize prompts for specific needs
- Flexible architecture supports future enhancements

## Usage Examples

### Test Generation
**Input:** "Generate tests for utils.js"

**Flow:**
1. Planner detects taskType: 'test'
2. Planner selects tool: 'read_file' (to understand the code)
3. Executor uses TEST_GENERATION_PROMPT
4. Output: Comprehensive test suite with Node.js test runner

### Documentation
**Input:** "Add JSDoc comments to api.js"

**Flow:**
1. Planner detects taskType: 'documentation'
2. Planner selects tool: 'read_file'
3. Executor uses DOCUMENTATION_PROMPT
4. Output: Complete JSDoc with @param, @returns, @example

### Code Generation
**Input:** "Create a new authentication module"

**Flow:**
1. Planner detects taskType: 'code'
2. Planner selects tool: 'list_files' (to understand project structure)
3. Executor uses CODE_GENERATION_PROMPT
4. Output: Production-quality code with error handling

## Testing the Improvements

### Recommended Test Cases

1. **Test Generation:**
   - "Generate tests for index.js"
   - "Create unit tests for the authentication module"
   - "Write test cases for error handling in utils.js"

2. **Documentation:**
   - "Add JSDoc to all functions in api.js"
   - "Create a README for this project"
   - "Document the authentication flow"

3. **Code Writing:**
   - "Create a new user service"
   - "Implement a caching layer"
   - "Add input validation to the API"

4. **Code Review:**
   - "Review the code in app.js"
   - "Check for security issues in auth.js"
   - "Analyze performance of the database queries"

## Migration Notes

### Backward Compatibility
- Old `EXECUTOR_PROMPT` is still exported for compatibility
- Existing code will continue to work without changes
- Gradual migration recommended

### Breaking Changes
- None - all changes are additive

### Recommended Updates
1. Update `agent/executor.js` to use `getExecutorPrompt()`
2. Update `agent/planner.js` to include taskType detection
3. Test with various user inputs to validate improvements

## Future Enhancements

### Potential Additions
1. **Refactoring Prompt** - Specialized for code refactoring tasks
2. **Debugging Prompt** - Enhanced for finding and fixing bugs
3. **Performance Optimization Prompt** - Focus on performance improvements
4. **Security Audit Prompt** - Specialized security analysis
5. **Migration Prompt** - Help with framework/library migrations

### Configuration Options
- Allow users to customize prompt templates
- Add project-specific context to prompts
- Support for different testing frameworks (Jest, Mocha, etc.)

## Metrics for Success

### Quality Indicators
- ✅ Test coverage percentage
- ✅ Number of edge cases covered
- ✅ Documentation completeness
- ✅ Code quality scores (linting, complexity)
- ✅ Error handling coverage

### User Experience
- ✅ Reduced need for prompt refinement
- ✅ Fewer iterations to get desired output
- ✅ Higher user satisfaction with generated code
- ✅ Faster task completion times

## Conclusion

These improvements transform the CLI coding agent from a generic code generator into a specialized, intelligent assistant that understands context, follows best practices, and produces production-ready output. The focus on test generation with Node.js built-in test runner ensures comprehensive, high-quality test coverage with proper edge case handling and meaningful assertions.

The hybrid approach of local keyword detection combined with AI planning provides both speed and intelligence, while the specialized prompts ensure consistent, high-quality output across all task types.