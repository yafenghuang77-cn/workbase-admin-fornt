import type { AxiosResponse } from 'axios';
import { AxiosHeaders } from 'axios';

export function readResponseHeader(
  headers: AxiosResponse<unknown>['headers'],
  name: string,
): string {
  const value =
    headers instanceof AxiosHeaders
      ? headers.get(name)
      : Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  return typeof value === 'string' ? value : '';
}

export function readJsonBlob(
  blob: Blob,
  headers: AxiosResponse<unknown>['headers'],
): Promise<unknown> | undefined {
  const mediaType = blob.type || readResponseHeader(headers, 'content-type');
  if (!/^\s*application\/(?:json|[^;\s/]+\+json)(?:\s*;|$)/i.test(mediaType)) return undefined;

  return Promise.resolve()
    .then(() => blob.text())
    .then((text): unknown => JSON.parse(text))
    .catch(() => undefined);
}
