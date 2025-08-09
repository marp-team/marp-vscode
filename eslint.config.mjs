import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginImport from 'eslint-plugin-import'
import eslintPluginJest from 'eslint-plugin-jest'
import eslintPluginN from 'eslint-plugin-n'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']
const testFiles = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.mts',
  '**/*.test.cts',
  'jest.setup.js',
]

const forFiles = (files, confs) => confs.map((conf) => ({ ...conf, files }))

export default tseslint.config(
  js.configs.recommended,
  eslintPluginImport.flatConfigs.recommended,
  {
    plugins: {
      n: eslintPluginN,
    },
    rules: {
      'n/prefer-node-protocol': 'error',
    },
  },
  ...forFiles(tsFiles, [
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    {
      extends: [eslintPluginImport.flatConfigs.recommended],
    },
    {
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          { assertionStyle: 'as' },
        ],
      },
    },
  ]),
  ...forFiles(testFiles, [
    eslintPluginJest.configs['flat/recommended'],
    eslintPluginJest.configs['flat/style'],
    { languageOptions: { globals: { ...globals.jest } } },
  ]),
  eslintConfigPrettier,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'import/order': ['error', { alphabetize: { order: 'asc' } }],
    },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
  },
  {
    ignores: [
      '.vscode-test-web/**/*',
      'coverage/**/*',
      'dist/**/*',
      './lib/**/*',
      'node_modules/**/*',
      './preview/**/*',
    ],
  },
)
