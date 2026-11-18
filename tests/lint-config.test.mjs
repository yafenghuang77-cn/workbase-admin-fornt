import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import { describe, expect, test } from 'vitest';

const eslint = new ESLint();

describe('测试文件规范', () => {
  test.each([
    ['vitest/no-focused-tests', "test.only('focused', () => expect(true).toBe(true));"],
    ['vitest/expect-expect', "test('no assertion', () => {});"],
  ])('拦截违反 %s 的反例', async (ruleId, source) => {
    const [result] = await eslint.lintText(`import { expect, test } from 'vitest';\n${source}`, {
      filePath: 'tests/unit/lint-probe.test.jsx',
    });

    expect(result.messages).toContainEqual(expect.objectContaining({ ruleId, severity: 2 }));
  });

  test.each([
    [
      'testing-library/no-wait-for-side-effects',
      'fireEvent, screen, waitFor',
      "fireEvent.click(screen.getByRole('button'));\nexpect(true).toBe(true);",
    ],
    [
      'testing-library/no-wait-for-multiple-assertions',
      'waitFor',
      'expect(1).toBe(1);\nexpect(1).toBeGreaterThan(0);',
    ],
  ])('%s 在自动修复模式下仍报错但不改写源码', async (ruleId, imports, body) => {
    const code = [
      `import { ${imports} } from '@testing-library/react';`,
      "import { expect, test } from 'vitest';",
      "test('invalid callback', async () => {",
      '  await waitFor(() => {',
      body,
      '  });',
      '});',
    ].join('\n');
    const [result] = await new ESLint({ fix: true }).lintText(code, {
      filePath: 'tests/unit/lint-probe.test.jsx',
    });

    expect(result.messages).toContainEqual(expect.objectContaining({ ruleId, severity: 2 }));
    expect(result.messages.find((message) => message.ruleId === ruleId)?.fix).toBeUndefined();
    expect(result.output).toBeUndefined();
  });

  test('允许显式导入 Vitest API 并等待异步断言', async () => {
    const code = [
      "import { expect, test } from 'vitest';",
      "test('async assertion', async () => { await expect(Promise.resolve(42)).resolves.toBe(42); });",
    ].join('\n');
    const [result] = await eslint.lintText(code, { filePath: 'tests/unit/lint-probe.test.jsx' });

    expect(result.messages).toEqual([]);
  });
});

test('测试项目的类型感知规则拦截未等待的 Promise', { timeout: 15_000 }, async () => {
  const [result] = await eslint.lintText('Promise.resolve(42);', { filePath: 'tests/setup.ts' });

  expect(result.messages).toContainEqual(
    expect.objectContaining({ ruleId: '@typescript-eslint/no-floating-promises', severity: 2 }),
  );
});

test('应用源码拒绝 var，构建产物不进入 ESLint 检查', async () => {
  const code = 'var count = 1; console.error(count);';
  const [source] = await eslint.lintText(code, { filePath: 'src/lint-probe.js' });
  const output = await eslint.lintText(code, {
    filePath: 'workbase/js/lint-probe.js',
    warnIgnored: false,
  });

  expect(source.messages).toContainEqual(
    expect.objectContaining({ ruleId: 'no-var', severity: 2 }),
  );
  expect(output).toEqual([]);
});

test('Less 允许类选择器并拒绝 ID 选择器', async () => {
  const codeFilename = 'src/lint-probe.less';
  const accepted = await stylelint.lint({
    code: '@text-color: #222;\n.card {\n  color: @text-color;\n}',
    codeFilename,
  });
  const rejected = await stylelint.lint({
    code: '#card {\n  color: #222;\n}',
    codeFilename,
  });

  expect(accepted.results[0].warnings).toEqual([]);
  expect(rejected.results[0].warnings).toContainEqual(
    expect.objectContaining({ rule: 'selector-max-id', severity: 'error' }),
  );
});
