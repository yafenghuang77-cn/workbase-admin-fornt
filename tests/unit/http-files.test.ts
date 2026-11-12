import type { AxiosAdapter, AxiosProgressEvent } from 'axios';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { queryClient } from '@/query-client';
import { ApiError, getErrorMessage } from '@/utils/http/error';
import { downloadFile } from '@/utils/http/helpers/download';
import { uploadFile } from '@/utils/http/helpers/upload';
import { http } from '@/utils/http/instance';
import { registerHttpNotifier } from '@/utils/http/notify';

vi.mock('@/utils/http/instance', () => ({ http: { request: vi.fn() } }));

const request = vi.mocked(http.request);
const createObjectURL = vi.fn<typeof URL.createObjectURL>().mockReturnValue('blob:report');
const revokeObjectURL = vi.fn<typeof URL.revokeObjectURL>();

beforeEach(() => {
  request.mockReset();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function respondWithFile(data: Blob, headers: Readonly<Record<string, string>> = {}) {
  request.mockImplementationOnce(async (_config, parser) => {
    if (parser === undefined) throw new Error('下载需要读取完整响应');
    return parser({
      data,
      headers: new AxiosHeaders(headers),
      config: { headers: new AxiosHeaders() },
      status: 200,
      statusText: 'OK',
    });
  });
}

test('上传构建 FormData，转发进度和取消信号并跳过去重', async () => {
  const file = new File(['test'], 'report.txt');
  const { signal } = new AbortController();
  const onProgress = vi.fn<(event: AxiosProgressEvent) => void>();
  const progress: AxiosProgressEvent = { loaded: 4, total: 4, bytes: 4, lengthComputable: true };

  request.mockImplementationOnce(async (config) => {
    expect(config).toMatchObject({ url: '/files', method: 'post', skipDedupe: true, signal });
    if (!(config.data instanceof FormData)) throw new Error('上传需要使用 FormData');
    expect(config.data.get('report')).toBe(file);
    expect(config.data.get('description')).toBe('test file');
    config.onUploadProgress?.(progress);
    return { id: 7 };
  });

  await expect(
    uploadFile<{ id: number }>({
      url: '/files',
      file,
      fieldName: 'report',
      extraFields: { description: 'test file', report: 'unused' },
      signal,
      onProgress,
    }),
  ).resolves.toEqual({ id: 7 });
  expect(onProgress).toHaveBeenCalledWith(progress);
});

test.each([
  { header: 'attachment; filename="report.pdf"', expected: 'report.pdf' },
  {
    header: `attachment; filename="fallback.pdf"; filename*=UTF-8'zh'%E4%B8%AD%E6%96%87.pdf`,
    expected: '中文.pdf',
  },
  {
    header: `attachment; filename*=UTF-8''%XY; filename="fall;back.pdf"`,
    expected: 'fall;back.pdf',
  },
  { header: '', expected: 'download' },
])('下载文件名为 $expected 并释放对象 URL', async ({ header, expected }) => {
  vi.useFakeTimers();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const blob = new Blob(['file content'], { type: 'application/pdf' });
  respondWithFile(blob, { 'content-disposition': header });

  await downloadFile({ url: '/reports' });

  expect(request.mock.calls[0]?.[0]).toMatchObject({
    url: '/reports',
    method: 'get',
    responseType: 'blob',
    skipDedupe: true,
    skipRouteCancel: true,
  });
  expect(createObjectURL).toHaveBeenCalledWith(blob);
  expect(click).toHaveBeenCalledOnce();
  expect(click.mock.contexts[0]).toHaveProperty('download', expected);
  expect(click.mock.contexts[0]).toHaveProperty('isConnected', false);
  expect(revokeObjectURL).not.toHaveBeenCalled();
  vi.runOnlyPendingTimers();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
});

test('下载可覆盖文件名并保留声明为附件的 JSON', async () => {
  vi.useFakeTimers();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const { signal } = new AbortController();
  const blob = new Blob(['{"code": 7}'], { type: 'application/json' });
  respondWithFile(blob, { 'content-disposition': 'attachment; filename="report.json"' });

  await downloadFile({ url: '/reports', method: 'post', filename: 'manual.json', signal });

  expect(request.mock.calls[0]?.[0]).toMatchObject({ method: 'post', signal });
  expect(click.mock.contexts[0]).toHaveProperty('download', 'manual.json');
  vi.runOnlyPendingTimers();
});

test('下载识别 JSON 业务错误并保留 Axios 请求错误', async () => {
  const blob = new Blob(['{"code": 7, "message": "无法导出"}'], { type: 'application/json' });
  respondWithFile(blob);
  const result = downloadFile({ url: '/reports', silent: true });

  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({ code: 7, message: '无法导出', httpStatus: 200 });
  expect(request.mock.calls[0]?.[0]).toMatchObject({ silent: true });
  expect(createObjectURL).not.toHaveBeenCalled();

  const error = new AxiosError('Download failed');
  request.mockRejectedValueOnce(error);
  await expect(downloadFile({ url: '/reports' })).rejects.toBe(error);
});

test.each([
  { caller: '独立调用', viaQuery: false, mimeType: 'application/json' },
  { caller: 'Query', viaQuery: true, mimeType: '' },
])(
  '$caller 下载失败时显示 JSON Blob 中的错误并保留原始 AxiosError',
  async ({ viaQuery, mimeType }) => {
    const { http: actualHttp } = await vi.importActual<{ http: typeof http }>(
      '@/utils/http/instance',
    );
    const message = '没有可导出的订单';
    const data = new Blob([JSON.stringify({ code: 422, message })], { type: mimeType });
    const error = new AxiosError(
      'Request failed with status code 422',
      undefined,
      undefined,
      undefined,
      {
        data,
        headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
        config: { headers: new AxiosHeaders() },
        status: 422,
        statusText: 'Unprocessable Entity',
      },
    );
    const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(error);
    request.mockImplementationOnce((config, parser) =>
      actualHttp.request({ ...config, adapter }, parser),
    );
    const notify = vi.fn();
    const unregister = registerHttpNotifier(notify);

    try {
      const fetchDownload = () => downloadFile({ url: '/reports', silent: viaQuery });
      const result = viaQuery
        ? queryClient.fetchQuery({ queryKey: ['download-errors'], queryFn: fetchDownload })
        : fetchDownload();

      await expect(result).rejects.toBe(error);
      expect(error.response).toMatchObject({ status: 422, data });
      expect(getErrorMessage(error)).toBe(message);
      expect(notify).toHaveBeenCalledExactlyOnceWith(message, 'error');
      expect(adapter).toHaveBeenCalledOnce();
      expect(createObjectURL).not.toHaveBeenCalled();
    } finally {
      unregister();
      queryClient.clear();
    }
  },
);
