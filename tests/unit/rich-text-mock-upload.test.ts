import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { isSafeUrl, sanitizeContent } from '@/components/rich-text-editor/content';
import { createMockUploads } from '@/pages/rich-text-editor/mock-upload';

const sessions: Array<ReturnType<typeof createMockUploads>> = [];
const createUrl = vi.fn<(file: Blob) => string>();
const revokeUrl = vi.fn<(url: string) => void>();

beforeEach(() => {
  vi.useFakeTimers();
  let id = 0;
  createUrl.mockImplementation(() => `blob:http://localhost/mock-${++id}`);
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }),
  );
});

afterEach(() => {
  sessions.splice(0).forEach((session) => session.clear());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function createSession() {
  const session = createMockUploads();
  sessions.push(session);
  return session;
}

test('模拟上传保留所选文件，媒体与附件可回显，清空后撤销临时地址', async () => {
  const session = createSession();
  const file = new File(['selected file'], '演示.pdf', { type: 'application/pdf' });
  const onProgress = vi.fn();
  const pending = session.fileUpload.upload(file, {
    signal: new AbortController().signal,
    onProgress,
  });
  await vi.runAllTimersAsync();
  const result = await pending;
  expect(createUrl).toHaveBeenCalledWith(file);
  expect(result.name).toBe(file.name);
  expect(onProgress).toHaveBeenLastCalledWith(100);
  expect(() =>
    sanitizeContent({ type: 'attachment', attrs: { href: result.url, name: file.name } }),
  ).not.toThrow();
  expect(isSafeUrl(result.url, 'image')).toBe(true);
  expect(isSafeUrl(result.url, 'video')).toBe(true);
  expect(isSafeUrl(result.url, 'link')).toBe(false);
  expect(isSafeUrl('blob:http://localhost/external', 'file')).toBe(false);
  session.clear();
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(result.url);
  expect(isSafeUrl(result.url, 'file')).toBe(false);
  expect(() => sanitizeContent({ type: 'video', attrs: { src: result.url } })).toThrow('不支持');
  session.clear();
});

test.each(['取消', '清空'])('%s 模拟上传会停止进度，不创建文件地址', async (action) => {
  const session = createSession();
  const controller = new AbortController();
  const onProgress = vi.fn();
  const pending = session.videoUpload.upload(new File(['video'], 'demo.mp4'), {
    signal: controller.signal,
    onProgress,
  });
  const rejected = pending.catch(() => 'cancelled');
  await vi.advanceTimersByTimeAsync(200);
  expect(onProgress).toHaveBeenCalled();
  const calls = onProgress.mock.calls.length;
  if (action === '取消') controller.abort();
  else session.clear();
  expect(await rejected).toBe('cancelled');
  await vi.runAllTimersAsync();
  expect(onProgress).toHaveBeenCalledTimes(calls);
  expect(createUrl).not.toHaveBeenCalled();
});

test('清理一个页面的模拟文件不撤销另一个页面的预览', async () => {
  const first = createSession();
  const second = createSession();
  const context = { signal: new AbortController().signal, onProgress: vi.fn() };
  const firstPending = first.imageUpload.upload(new File(['a'], 'a.png'), context);
  const secondPending = second.imageUpload.upload(new File(['b'], 'b.png'), context);
  await vi.runAllTimersAsync();
  const one = await firstPending;
  const two = await secondPending;
  first.clear();
  expect(isSafeUrl(one.url, 'image')).toBe(false);
  expect(isSafeUrl(two.url, 'image')).toBe(true);
});
