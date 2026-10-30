import type { Root } from 'react-dom/client';

import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

let applicationRoot: Root | undefined;

// Keep real React rendering while retaining the entrypoint's root for teardown.
vi.mock(import('react-dom/client'), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createRoot: (...args: Parameters<typeof original.createRoot>) => {
      applicationRoot = original.createRoot(...args);
      return applicationRoot;
    },
  };
});

afterEach(() => {
  act(() => {
    applicationRoot?.unmount();
  });
  applicationRoot = undefined;
  vi.resetModules();
});

test('入口在根节点中渲染当前页面', async () => {
  window.history.replaceState(null, '', import.meta.env.BASE_URL);
  render(<div id="root" />);

  await act(async () => {
    await import('@/main');
  });

  expect(await screen.findByRole('heading', { name: '欢迎使用 Workbase' })).toBeVisible();
  expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}welcome`);
});

test('缺少根节点时报告明确的启动错误', async () => {
  await expect(import('@/main')).rejects.toThrow('Root element #root was not found');
});
