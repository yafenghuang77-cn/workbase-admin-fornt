import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { AbortError } from 'es-toolkit';
import { afterEach, expect, test, vi } from 'vitest';

import { isLocalAssetUrl } from '@/components/rich-text-editor/local-assets';
import { RichTextEditorPage } from '@/pages/rich-text-editor';
import { createMockUploads } from '@/pages/rich-text-editor/mock-upload';
import { AppProviders } from '@/providers/AppProviders';

const assetUrl = 'blob:https://example.test/notice';
const notice = new File(['公告正文'], 'notice.txt', { type: 'text/plain' });
const OriginalURL = URL;

const mockObjectUrls = () => {
  const create = vi.fn(() => assetUrl);
  const revoke = vi.fn<(url: string) => void>();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = create;
      static override revokeObjectURL = revoke;
    },
  );
  return { create, revoke };
};

afterEach(() => {
  vi.useRealTimers();
  globalThis.URL = OriginalURL;
});

test('清理演示上传时取消进行中的任务并允许下一次上传', async () => {
  vi.useFakeTimers();
  const { create } = mockObjectUrls();
  const uploads = createMockUploads();
  const onProgress = vi.fn<(percent: number) => void>();
  const context = { signal: new AbortController().signal, onProgress };

  const canceled = uploads.fileUpload.upload(notice, context).catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(160);
  expect(onProgress).toHaveBeenCalledExactlyOnceWith(10);

  uploads.clear();
  expect(await canceled).toBeInstanceOf(AbortError);
  await vi.runAllTimersAsync();
  expect(onProgress).toHaveBeenCalledTimes(1);
  expect(create).not.toHaveBeenCalled();

  onProgress.mockClear();
  const next = uploads.fileUpload.upload(notice, context);
  try {
    await vi.runAllTimersAsync();
    await expect(next).resolves.toEqual({ name: 'notice.txt', url: assetUrl });
    expect(onProgress.mock.calls.flat()).toEqual([10, 35, 65, 90, 100]);
  } finally {
    uploads.clear();
  }
});

test('离开富文本演示页时取消上传并释放已有的本地预览地址', async () => {
  const { create, revoke } = mockObjectUrls();
  const { unmount } = render(<RichTextEditorPage />, { wrapper: AppProviders });

  const editor = await screen.findByRole('textbox', { name: '文章正文' });
  const pasteNotice = () =>
    fireEvent.paste(editor, { clipboardData: { files: [notice], getData: () => '' } });
  pasteNotice();
  const preview = await screen.findByRole('document', { name: '文章展示预览' });
  expect(
    await within(preview).findByRole('link', { name: /notice\.txt/u }, { timeout: 3_000 }),
  ).toHaveAttribute('href', assetUrl);
  expect(isLocalAssetUrl(assetUrl)).toBe(true);

  vi.useFakeTimers();
  pasteNotice();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(160);
  });
  expect(screen.getByText('附件上传中 10%')).toBeInTheDocument();
  unmount();
  await vi.runAllTimersAsync();

  expect(revoke).toHaveBeenCalledExactlyOnceWith(assetUrl);
  expect(create).toHaveBeenCalledExactlyOnceWith(notice);
  expect(isLocalAssetUrl(assetUrl)).toBe(false);
});
