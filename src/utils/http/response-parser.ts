import type { AxiosResponse } from 'axios';

import { ApiError, ApiResponseError } from './error';

export type HttpResponse<T = unknown, D = unknown> = AxiosResponse<T, D, object, unknown>;
export type ResponseParser<T = unknown, D = unknown> = (
  response: HttpResponse<unknown, D>,
) => T | Promise<T>;
type DefaultResponseParser = <D>(response: HttpResponse<unknown, D>) => unknown;

interface ResponseConfig {
  dataField: string;
  codeField: string;
  messageField: string;
  successCode: number;
}

let responseConfig: ResponseConfig = {
  dataField: 'data',
  codeField: 'code',
  messageField: 'message',
  successCode: 0,
};

export function configureResponse(options: Partial<ResponseConfig>): void {
  responseConfig = { ...responseConfig, ...options };
}

function isEnvelope(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function assertBusinessSuccess(body: unknown, status: number): void {
  const { codeField, messageField, successCode } = responseConfig;
  if (!isEnvelope(body) || !Object.hasOwn(body, codeField)) return;

  const code = body[codeField];
  if (typeof code !== 'number' || !Number.isFinite(code)) {
    throw new ApiResponseError(`响应字段 ${codeField} 必须是数字`, status);
  }
  if (code !== successCode) {
    const message = body[messageField];
    throw new ApiError(
      code,
      typeof message === 'string' && message.trim() ? message : '请求失败',
      status,
    );
  }
}

function parseEnvelope({ data: body, status }: Pick<HttpResponse, 'data' | 'status'>): unknown {
  const { dataField } = responseConfig;
  assertBusinessSuccess(body, status);
  if (!isEnvelope(body) || !Object.hasOwn(body, dataField) || body[dataField] === undefined) {
    throw new ApiResponseError(`响应缺少 ${dataField} 字段`, status);
  }
  return body[dataField];
}

let responseParser: DefaultResponseParser = parseEnvelope;

export function setResponseParser(parser: DefaultResponseParser): void {
  responseParser = parser;
}

export function getResponseParser(): DefaultResponseParser {
  return responseParser;
}
