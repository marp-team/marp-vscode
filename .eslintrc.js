module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  rules: {
    'import/order': ['error', { alphabetize: { order: 'asc' } }],
  },
  settings: {
    'import/resolver': { typescript: { alwaysTryTypes: true } },
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/stylistic',
        'plugin:import/typescript',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    {
      files: ['**/*.test.js', '**/*.test.ts'],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended', 'plugin:jest/style'],
    },
  ],
}
