import testingLibrary from 'eslint-plugin-testing-library';

// In 7.16.2 these fixers assume whole-line statements. They can crash on EOF
// or move unrelated code. Keep diagnostics; require manual fixes for these two
// rules. Recheck upstream behavior before removing this compatibility wrapper.
function withoutAutofix(rule) {
  const { fixable, ...meta } = rule.meta;
  return {
    ...rule,
    meta,
    create(context) {
      const diagnosticContext = Object.create(context, {
        report: {
          value(descriptor) {
            const { fix, ...diagnostic } = descriptor;
            context.report(diagnostic);
          },
        },
      });
      return rule.create(diagnosticContext);
    },
  };
}

export default {
  ...testingLibrary.configs['flat/react'],
  plugins: {
    'testing-library': {
      ...testingLibrary,
      rules: {
        ...testingLibrary.rules,
        'no-wait-for-side-effects': withoutAutofix(
          testingLibrary.rules['no-wait-for-side-effects'],
        ),
        'no-wait-for-multiple-assertions': withoutAutofix(
          testingLibrary.rules['no-wait-for-multiple-assertions'],
        ),
      },
    },
  },
};
