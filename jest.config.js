const esModules = ['unist-util-visit', 'unist-util-is']

module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts'],
  coverageThreshold: { global: { lines: 95 } },
  preset: 'ts-jest/presets/js-with-babel',
  restoreMocks: true,
  testEnvironment: 'node',
  transformIgnorePatterns: [`/node_modules/(?!${esModules.join('|')})`],
}
