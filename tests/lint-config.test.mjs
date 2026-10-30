import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import { expect, test } from 'vitest';

const cases = [
  {
    rule: 'testing-library/no-wait-for-side-effects',
    body: "fireEvent.click(screen.getByRole('button')); expect(true).toBe(true);",
  },
  {
    rule: 'testing-library/no-wait-for-multiple-assertions',
    body: 'expect(true).toBe(true); expect(true).toBeTruthy();',
  },
];

for (const { rule, body } of cases) {
  for (const multiline of [false, true]) {
    for (const fix of [false, true]) {
      test(`${rule}: multiline=${multiline}, fix=${fix}`, async () => {
        const separator = multiline ? '\n' : ' ';
        const code = [
          "import { fireEvent, screen, waitFor } from '@testing-library/react';",
          "import { expect, test } from 'vitest';",
          ["test('example', async () => {", 'await waitFor(() => {', body, '});', '});'].join(
            separator,
          ),
        ].join('\n');
        const eslint = new ESLint({ fix });
        const [result] = await eslint.lintText(code, { filePath: 'tests/unit/compat.test.jsx' });
        const diagnostics = result.messages.filter((message) => message.ruleId === rule);

        expect(
          diagnostics.length,
          'The rule must still reject the invalid pattern',
        ).toBeGreaterThan(0);
        expect(diagnostics.every((message) => message.severity === 2 && !message.fix)).toBe(true);
        expect(result.output, 'Autofix must not move or remove test statements').toBeUndefined();
      });
    }
  }
}

const vitestCases = [
  ['no-focused-tests', "test.only('focused', () => { expect(1).toBe(1); });"],
  ['expect-expect', "test('missing assertion', () => {});"],
  [
    'valid-expect',
    "test('unhandled assertion', () => { expect(Promise.resolve(1)).resolves.toBe(1); });",
  ],
  [
    'valid-expect',
    "test('excess arguments', () => { expect(1, 'diagnostic message', 'extra argument').toBe(1); });",
  ],
];

for (const [rule, body] of vitestCases) {
  test(`Vitest rejects ${rule}: ${body}`, async () => {
    const code = `import { expect, test } from 'vitest';\n${body}\n`;
    const [result] = await new ESLint().lintText(code, {
      filePath: 'tests/unit/vitest-rules.test.jsx',
    });
    expect(result.messages).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: `vitest/${rule}`, severity: 2 })]),
    );
  });
}

test('explicit Vitest imports, diagnostic messages and awaited assertions remain valid', async () => {
  const [result] = await new ESLint().lintText(
    `import { expect, test } from 'vitest';

    test('awaited assertion', async () => {
      const message = 'The promise should resolve to the expected value';
      await expect(Promise.resolve(1), message).resolves.toBe(1);
    });`,
    { filePath: 'tests/unit/vitest-rules.test.jsx' },
  );
  expect(result.messages).toEqual([]);
});

const typedCases = [
  ['no-misused-spread', 'export const value = { ...Promise.resolve({ id: 1 }) };'],
  ['no-base-to-string', 'export const value = String({ id: 1 });'],
  ['no-unsafe-assignment', 'export const value = JSON.parse("{}");'],
  ['no-unsafe-call', 'JSON.parse("{}")();'],
  ['no-unsafe-member-access', 'JSON.parse("{}").name;'],
  ['no-unsafe-argument', 'export const value = Math.abs(JSON.parse("0"));'],
  ['no-unsafe-return', 'export function read(text: string): string { return JSON.parse(text); }'],
  ['only-throw-error', 'export function fail(reason: string) { throw reason; }'],
  ['only-throw-error', 'export function fail(reason: unknown) { throw reason; }'],
  [
    'only-throw-error',
    'type NotFoundError = { message: string }; export function fail(reason: NotFoundError) { throw reason; }',
  ],
];

for (const [rule, code] of typedCases) {
  test(`typed safety rejects ${rule}: ${code}`, async () => {
    const eslint = new ESLint();
    // An existing TS project path lets projectService type-check the in-memory
    // source; this does not write to main.tsx or add fixtures to the app.
    const [result] = await eslint.lintText(code, { filePath: 'src/main.tsx' });
    expect(result.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: `@typescript-eslint/${rule}`, severity: 2 }),
      ]),
    );
  });
}

test('unknown boundaries, type narrowing and Error rethrows remain valid', async () => {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(
    `export function read(text: string): string {
      const value: unknown = JSON.parse(text);
      if (typeof value !== 'string') {
        throw new Error('Expected a string');
      }
      return value;
    }
    export function rethrow(text: string): unknown {
      try { return read(text); } catch (error) { console.error(error); throw error; }
    }`,
    { filePath: 'src/main.tsx' },
  );
  expect(result.messages).toEqual([]);
});

test('TanStack Router redirect and notFound remain valid control flow', async () => {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(
    `import { notFound, redirect } from '@tanstack/react-router';

    export function redirectToLogin() { throw redirect({ to: '/' }); }
    export function missingPage() { throw notFound(); }
    `,
    { filePath: 'src/main.tsx' },
  );
  expect(result.messages).toEqual([]);
});

const languageCases = [
  ['no-constructor-return', 'export class Item { constructor() { return {}; } }'],
  [
    'no-unmodified-loop-condition',
    'export function run(limit) { let index = 0; while (index < limit) { console.error(index); } }',
  ],
  ['no-unsafe-optional-chaining', 'export function total(item) { return item?.price * 2; }'],
  [
    'react/iframe-missing-sandbox',
    'export default function Frame() { return <iframe title="Preview" src="/preview" />; }',
  ],
  [
    'react/no-unsafe',
    "import { Component } from 'react'; export default class Old extends Component { UNSAFE_componentWillMount() { console.error('mount'); } render() { return null; } }",
  ],
  [
    'react-hooks/rules-of-hooks',
    "import { useState } from 'react'; export default function View({ active }) { if (active) { useState(0); } return null; }",
  ],
  [
    'react-hooks/exhaustive-deps',
    "import { useEffect } from 'react'; export default function View({ value }) { useEffect(() => { console.error(value); }, []); return null; }",
  ],
];

for (const [rule, code] of languageCases) {
  test(`JS / React / Hooks rejects ${rule}`, async () => {
    const [result] = await new ESLint().lintText(code, { filePath: 'src/rules-probe.jsx' });
    expect(result.messages).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: rule, severity: 2 })]),
    );
  });
}

test('safe React, optional chaining and object spread remain valid', async () => {
  const [result] = await new ESLint().lintText(
    `export default function Preview({ item }: { item?: { price: number } }) {
      const price = (item?.price ?? 0) * 2;
      const details = { ...item, price };
      return <iframe title={JSON.stringify(details)} sandbox="" src="/preview" />;
    }`,
    { filePath: 'src/main.tsx' },
  );
  expect(result.messages).toEqual([]);
});

const styleCases = [
  ['declaration-property-value-no-unknown', '.card { display: fleex; }', 'css'],
  [
    'declaration-block-no-duplicate-custom-properties',
    '.card {\n --gap: 1rem;\n --gap: 2rem;\n}',
    'css',
  ],
  ['custom-property-no-missing-var-function', '.card {\n --gap: 1rem;\n margin: --gap;\n}', 'css'],
  ['font-family-no-missing-generic-family-keyword', '.card { font-family: Arial; }', 'css'],
  ['media-query-no-invalid', '@media (width === 10px) { .card { display: block; } }', 'css'],
  ['no-invalid-position-at-import-rule', '.card { color: red; }\n@import "other.css";', 'css'],
  ['scss/at-rule-no-unknown', '@incldue theme;', 'scss'],
];

for (const [rule, code, extension] of styleCases) {
  test(`styles reject ${rule}`, async () => {
    const result = await stylelint.lint({ code, codeFilename: `src/rules-probe.${extension}` });
    expect(result.results[0].warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule, severity: 'error' })]),
    );
  });
}

for (const [extension, code] of [
  [
    'css',
    '@import "other.css";\n.card {\n --gap: 1rem;\n margin: var(--gap);\n font-family: Arial, sans-serif;\n display: flex;\n}',
  ],
  ['less', '@gap: 1rem;\n.card {\n margin: @gap;\n color: lighten(#333, 10%);\n}'],
  ['scss', '@mixin spacing($gap) { margin: $gap; }\n.card { @include spacing(1rem); }'],
]) {
  test(`valid ${extension} syntax remains supported`, async () => {
    const result = await stylelint.lint({ code, codeFilename: `src/rules-probe.${extension}` });
    expect(result.results[0].warnings).toEqual([]);
    expect(result.errored).toBe(false);
  });
}
