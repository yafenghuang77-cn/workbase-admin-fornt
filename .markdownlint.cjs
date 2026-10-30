const ali = require('markdownlint-config-ali');

// Replace the old MD024 alias with the current rule name.
const { 'no-duplicate-header': duplicateHeading, ...rules } = ali;

module.exports = {
  ...rules,
  MD024: duplicateHeading,
  // Prettier owns wrapping; long links and Chinese paragraphs need not be split.
  MD013: false,
  // Prettier aligns table cells; require the same style in the current engine.
  MD060: { style: 'aligned' },
};
