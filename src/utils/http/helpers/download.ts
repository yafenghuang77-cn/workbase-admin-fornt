import { readJsonBlob, readResponseHeader } from '../blob-response';
import { ApiResponseError } from '../error';
import { http } from '../instance';
import { assertBusinessSuccess } from '../response-parser';

export interface DownloadOptions {
  url: string;
  method?: 'get' | 'post';
  params?: unknown;
  data?: unknown;
  filename?: string;
  signal?: AbortSignal | undefined;
  silent?: boolean;
}

function decodeExtendedFilename(value: string): string | undefined {
  const encoded = /^UTF-8'[^']*'([^\s]+)$/i.exec(value)?.[1];
  if (encoded === undefined) return undefined;

  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}

function parseContentDispositionFilename(header: string): string | undefined {
  const parameters = /;\s*([^;=\s]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]*))/g;
  let filename: string | undefined;

  for (const [, name, quoted, token] of header.matchAll(parameters)) {
    const value = quoted?.replace(/\\(.)/g, '$1') ?? token?.trim();
    if (!value) continue;

    const field = name?.toLowerCase();
    if (field === 'filename*') {
      const decoded = decodeExtendedFilename(value);
      if (decoded !== undefined) return decoded;
    }
    if (field === 'filename') filename ??= value;
  }

  return filename;
}

export async function downloadFile({
  url,
  method = 'get',
  params,
  data,
  filename,
  signal,
  silent,
}: DownloadOptions): Promise<void> {
  const { blob, headerFilename } = await http.request(
    {
      url,
      method,
      params,
      data,
      responseType: 'blob',
      headers: { Accept: '*/*' },
      skipDedupe: true,
      skipRouteCancel: true,
      ...(signal === undefined ? {} : { signal }),
      ...(silent === undefined ? {} : { silent }),
    },
    async ({ data: body, headers, status }) => {
      if (!(body instanceof Blob)) throw new ApiResponseError('下载响应不是文件', status);

      const disposition = readResponseHeader(headers, 'content-disposition');
      const headerFilename = parseContentDispositionFilename(disposition);
      if (headerFilename === undefined && !/^\s*attachment\b/i.test(disposition)) {
        assertBusinessSuccess(await readJsonBlob(body, headers), status);
      }
      return { blob: body, headerFilename };
    },
  );

  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename ?? headerFilename ?? 'download';

  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
