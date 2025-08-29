// Basic test to verify Jest setup works
describe('Basic Test Suite', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should work with environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

// Test that mocks are working
describe('Mock Tests', () => {
  it('should have console methods mocked', () => {
    console.log('This should be mocked');
    expect(console.log).toHaveBeenCalledWith('This should be mocked');
  });
});
