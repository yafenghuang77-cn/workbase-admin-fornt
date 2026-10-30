export default {
  extends: ['stylelint-config-ali'],
  defaultSeverity: 'error',
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/.cache/**',
    'playwright-report/**',
    'test-results/**',
    'src/generated/**',
    '**/*.{js,jsx,ts,tsx}',
  ],
  rules: {
    'block-no-empty': true,
    'at-rule-no-unknown': true,
    'declaration-block-no-duplicate-custom-properties': true,
    'font-family-no-missing-generic-family-keyword': true,
  },
  overrides: [
    {
      files: ['**/*.css'],
      rules: {
        // Validate standard CSS values without rejecting preprocessor syntax.
        'declaration-property-value-no-unknown': true,
        'custom-property-no-missing-var-function': true,
        'media-query-no-invalid': true,
        'no-invalid-position-at-import-rule': true,
        // Tailwind CSS 4 directives; normal CSS rules still apply.
        'at-rule-no-unknown': [
          true,
          {
            ignoreAtRules: [
              'theme',
              'source',
              'utility',
              'variant',
              'custom-variant',
              'apply',
              'reference',
              'config',
              'plugin',
            ],
          },
        ],
      },
    },
    {
      files: ['**/*.scss'],
      rules: {
        'at-rule-no-unknown': null,
        'scss/at-rule-no-unknown': true,
      },
    },
  ],
};
