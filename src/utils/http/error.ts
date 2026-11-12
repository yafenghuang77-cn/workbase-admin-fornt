import { isAxiosError } from 'axios';

import { readJsonBlob } from './blob-response';

const blobErrorMessages = new WeakMap<Error, string>();

export class ApiError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  constructor(code: number, message: string, httpStatus: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class ApiResponseError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = 'ApiResponseError';
    this.httpStatus = httpStatus;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isForbiddenError(error: unknown): boolean {
  return isAxiosError<unknown, unknown>(error) && error.response?.status === 403;
}

export function normalizeError(error: unknown): Error {
  if (error instanceof Error || isAxiosError<unknown, unknown>(error)) return error;
  return new Error('请求失败', { cause: error });
}

function readMessage(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    if (typeof data.message === 'string' && data.message.trim() !== '') return data.message;
  }
  return undefined;
}

export function captureBlobErrorMessage(error: unknown): Promise<void> | undefined {
  if (!isAxiosError<unknown, unknown>(error)) return undefined;
  const response = error.response;
  if (response?.status === 403 || !(response?.data instanceof Blob)) return undefined;

  return readJsonBlob(response.data, response.headers)?.then((data) => {
    const message = readMessage(data);
    if (message !== undefined) blobErrorMessages.set(error, message);
  });
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError<unknown, unknown>(error)) {
    const message = blobErrorMessages.get(error) ?? readMessage(error.response?.data);
    if (message !== undefined) return message;
  }

  return error instanceof Error && error.message.trim() !== '' ? error.message : '请求失败';
}
