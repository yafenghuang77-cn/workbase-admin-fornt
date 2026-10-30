import js from '@eslint/js';
import query from '@tanstack/eslint-plugin-query';
import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import testingLibraryReact from './config/eslint-testing-library.js';

const codeFiles = ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'];
const tsFiles = ['**/*.{ts,tsx,mts,cts}'];
const unusedVarsOptions = {
  args: 'all',
  argsIgnorePattern: '^_',
  caughtErrors: 'all',
  caughtErrorsIgnorePattern: '^_',
  ignoreRestSiblings: true,
};

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-ssr/**',
    // Vite build.outDir; generated bundles are not source files.
    'workbase/**',
    '**/coverage/**',
    '**/.cache/**',
    '.husky/_/**',
    'playwright-report/**',
    'test-results/**',
    'src/routeTree.gen.ts',
    'src/generated/**',
  ]),
  {
    name: 'project/javascript',
    files: codeFiles,
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { 'simple-import-sort': simpleImportSort },
    // Alibaba JS conventions; formatting rules are owned by Prettier.
    rules: {
      'array-callback-return': 'error',
      'block-scoped-var': 'error',
      curly: ['error', 'all'],
      'default-case-last': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'guard-for-in': 'error',
      'no-alert': 'error',
      'no-caller': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-constructor-return': 'error',
      'no-debugger': 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-implied-eval': 'error',
      'no-lone-blocks': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-promise-executor-return': 'error',
      'no-proto': 'error',
      'no-return-assign': ['error', 'always'],
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-template-curly-in-string': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unsafe-optional-chaining': ['error', { disallowArithmeticOperators: true }],
      'no-unused-vars': ['warn', unusedVarsOptions],
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      radix: 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'], // Non-style side effects retain their relative execution order.
            ['^node:'],
            ['^react(?:/|\\u0000|$)', '^react-dom(?:/|\\u0000|$)'],
            ['^@?\\w'],
            ['^@/'],
            ['^\\.\\.(?:/|$)'],
            ['^\\./'],
            ['^\\u0000.*\\.(?:css|less|scss)(?:[?#].*)?$'], // Styles last; preserve cascade order.
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  {
    name: 'project/typescript',
    files: tsFiles,
    extends: [tseslint.configs.recommended],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', unusedVarsOptions],
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/unified-signatures': 'error',
    },
  },
  {
    name: 'project/typed-safety',
    files: ['src/**/*.{ts,tsx,mts,cts}', 'tests/**/*.{ts,tsx}', 'vite.config.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-misused-spread': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      'no-throw-literal': 'off',
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allowThrowingAny: false,
          allowThrowingUnknown: false,
          allowRethrowing: true,
          // TanStack Router intentionally throws these control-flow objects.
          allow: [
            {
              from: 'package',
              package: '@tanstack/router-core',
              name: ['Redirect', 'NotFoundError'],
            },
          ],
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    name: 'project/query',
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    extends: [query.configs['flat/recommended']],
  },
  {
    name: 'project/react',
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    settings: { react: { version: 'detect' } },
    rules: {
      // React 19 uses TypeScript for props; legacy propTypes checks are not required.
      'react/prop-types': 'off',
      'react/button-has-type': 'error',
      'react/iframe-missing-sandbox': 'error',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
      'react/jsx-key': [
        'error',
        {
          checkFragmentShorthand: true,
          checkKeyMustBeforeSpread: true,
          warnOnDuplicates: true,
        },
      ],
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-pascal-case': 'error',
      'react/no-array-index-key': 'error',
      'react/no-unsafe': ['error', { checkAliases: true }],
      'react/no-unstable-nested-components': 'error',
      'react/self-closing-comp': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    name: 'project/browser',
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    name: 'project/vite-refresh',
    files: ['src/**/*.{jsx,tsx}'],
    extends: [reactRefresh.configs.vite],
  },
  {
    name: 'project/node',
    files: [
      '*.{js,mjs,cjs,ts,mts,cts}',
      '**/*.config.{js,mjs,cjs,ts,mts,cts}',
      'scripts/**/*.{js,mjs,cjs,ts,mts,cts}',
      'tests/lint-config.test.mjs',
    ],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    name: 'project/commonjs',
    files: ['**/*.{cjs,cts}'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    name: 'project/vitest',
    files: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      'tests/unit/**/*.{js,jsx,ts,tsx}',
      'tests/lint-config.test.mjs',
    ],
    extends: [vitest.configs.recommended],
    rules: {
      // Vitest supports an optional assertion failure message as the second argument.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
    },
  },
  {
    name: 'project/testing-library',
    files: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      'tests/unit/**/*.{js,jsx,ts,tsx}',
    ],
    extends: [testingLibraryReact],
    languageOptions: { globals: globals.browser },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // Keep last to prevent conflicts with Prettier.
  prettier,
]);
