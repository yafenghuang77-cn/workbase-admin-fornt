import type { AxiosProgressEvent } from 'axios';

import { http } from '../instance';

export interface UploadOptions {
  url: string;
  file: File | Blob;
  fieldName?: string;
  extraFields?: Readonly<Record<string, string>>;
  onProgress?: ((event: AxiosProgressEvent) => void) | undefined;
  signal?: AbortSignal | undefined;
  silent?: boolean;
  routeScoped?: boolean;
}

export function uploadFile<T = unknown>({
  url,
  file,
  fieldName = 'file',
  extraFields = {},
  onProgress,
  signal,
  silent,
  routeScoped,
}: UploadOptions): Promise<T> {
  const data = new FormData();
  for (const [name, value] of Object.entries(extraFields)) {
    data.set(name, value);
  }
  data.set(fieldName, file);

  return http.request<T, FormData>({
    url,
    method: 'post',
    data,
    skipDedupe: true,
    ...(onProgress === undefined ? {} : { onUploadProgress: onProgress }),
    ...(signal === undefined ? {} : { signal }),
    ...(silent === undefined ? {} : { silent }),
    ...(routeScoped === undefined ? {} : { routeScoped }),
  });
}
