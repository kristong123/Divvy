module.exports = {
    testEnvironment: "node",
    testMatch: ['**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    verbose: true,
    moduleDirectories: ['node_modules', '__mocks__'],
    restoreMocks: true,
    clearMocks: true
};