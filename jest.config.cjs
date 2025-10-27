module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/test/.env.js'],
  transformIgnorePatterns: ['/node_modules/(?!nanoid/)'],
};
