export default {
    testEnvironment: 'node',
    moduleFileExtensions: ['js', 'json'],
    
    // Transformation des modules ES6
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // Répertoires de tests
    testMatch: [
        '**/src/test/**/*.test.js'
    ],
    
    // Répertoires à ignorer
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/'
    ],
    
    // Timeout pour les tests
    testTimeout: 10000,

    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    collectCoverageFrom: [
        'src/**/*.js',
        '!src/test/**',
        '!src/**/*.test.js'
    ],
    
    clearMocks: true,
    restoreMocks: true
};
