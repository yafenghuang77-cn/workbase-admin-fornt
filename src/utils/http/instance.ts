import type { AxiosRequestConfig } from 'axios';
import axios, { AxiosHeaders, CanceledError, isAxiosError, isCancel } from 'axios';
import { isPlainObject } from 'es-toolkit/predicate';

import { parseAuthTokens, useAuthStore } from '@/stores/auth';

import { trackRequest, waitForRequest } from './cancel';
import {
  captureBlobErrorMessage,
  getErrorMessage,
  isForbiddenError,
  normalizeError,
} from './error';
import { notifyHttpError } from './notify';
import type { AuthSession } from './refresh';
import { handleUnauthorized, isSessionExpiredError } from './refresh';
import { canSnapshotReplayConfig, snapshotReplayConfig } from './replay';
import type { HttpResponse, ResponseParser } from './response-parser';
import { getResponseParser } from './response-parser';

export type HttpRequestConfig<D = unknown> = Omit<
  AxiosRequestConfig<D, unknown>,
  'allowAbsoluteUrls' | 'baseURL' | 'signal' | 'url'
> & {
  url: string;
  signal?: AbortSignal;
  silent?: boolean;
  skipAuth?: boolean;
  skipDedupe?: boolean;
  skipRefresh?: boolean;
  skipRouteCancel?: boolean;
  routeScoped?: boolean;
  replayOnUnauthorized?: boolean;
};

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';
const client = axios.create({
  baseURL,
  allowAbsoluteUrls: false,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

const readMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

function getRequestKey<D>(
  config: HttpRequestConfig<D>,
  method: string,
  session: AuthSession | undefined,
) {
  // Basic Auth credentials and custom serialization are outside the default dedupe policy.
  if (
    config.skipDedupe === true ||
    config.auth !== undefined ||
    config.paramsSerializer !== undefined ||
    config.transformRequest !== undefined ||
    config.formSerializer !== undefined ||
    typeof config.withXSRFToken === 'function'
  ) {
    return undefined;
  }

  const data = config.data;
  if (typeof data === 'object' && data !== null && !Array.isArray(data) && !isPlainObject(data)) {
    return undefined;
  }

  try {
    const url = new URL(
      client.getUri({ ...config, baseURL, allowAbsoluteUrls: false }),
      'http://localhost',
    );
    url.hash = '';
    url.searchParams.sort();
    // AxiosHeaders.toJSON omits flags such as false that suppress default headers.
    const headers =
      config.headers instanceof AxiosHeaders
        ? Object.fromEntries(Object.entries<unknown>(config.headers))
        : config.headers;

    return JSON.stringify(
      {
        method,
        url: url.href,
        headers: JSON.stringify(headers),
        responseType: config.responseType,
        withCredentials: config.withCredentials,
        withXSRFToken: config.withXSRFToken,
        xsrfCookieName: config.xsrfCookieName,
        xsrfHeaderName: config.xsrfHeaderName,
        sessionVersion: session?.version,
        data,
      },
      (_key, value: unknown) => {
        if (isPlainObject(value)) {
          return Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, value[key]]),
          );
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          throw new TypeError('请求包含无法用于去重的值');
        }
        return value;
      },
    );
  } catch {
    // Axios owns serialization errors. A request without a usable key can still be sent.
    return undefined;
  }
}

function assertActive(signal: AbortSignal, session: AuthSession | undefined): void {
  if (session !== undefined) useAuthStore.getState().syncSession();
  if (
    signal.aborted ||
    (session !== undefined && useAuthStore.getState().sessionVersion !== session.version)
  ) {
    throw new CanceledError('请求已取消');
  }
}

async function refreshTokens(refreshToken: string) {
  const response = await client.post<unknown>('/auth/refresh', { refreshToken });
  return parseAuthTokens(await getResponseParser()(response));
}

async function send<T, D>(
  config: HttpRequestConfig<D>,
  method: string,
  signal: AbortSignal,
  session: AuthSession | undefined,
): Promise<HttpResponse<T, D>> {
  const canRefresh =
    session !== undefined && config.auth === undefined && config.skipRefresh !== true;
  const canReplay =
    (readMethods.has(method) || config.replayOnUnauthorized === true) &&
    canSnapshotReplayConfig(config);
  const replayConfig = canRefresh && canReplay ? snapshotReplayConfig(config) : undefined;

  function dispatch(
    request: HttpRequestConfig<D>,
    token: string | null | undefined,
  ): Promise<HttpResponse<T, D>> {
    const requestConfig = { ...request, signal, baseURL, allowAbsoluteUrls: false };
    if (token != null && request.auth === undefined) {
      const authorization = { Authorization: `Bearer ${token}` };
      requestConfig.headers =
        request.headers instanceof AxiosHeaders
          ? AxiosHeaders.concat(request.headers, authorization)
          : { ...request.headers, ...authorization };
    }
    return client.request<T, HttpResponse<T, D>, D, unknown>(requestConfig);
  }

  try {
    const initialConfig = replayConfig === undefined ? config : snapshotReplayConfig(replayConfig);
    return await dispatch(initialConfig, session?.accessToken);
  } catch (error) {
    if (isCancel(error)) throw error;
    assertActive(signal, session);
    if (!canRefresh || !isAxiosError<unknown, unknown>(error) || error.response?.status !== 401) {
      throw error;
    }

    const token = await waitForRequest(handleUnauthorized(error, session, refreshTokens), signal);
    assertActive(signal, session);
    if (replayConfig === undefined) throw error;

    return dispatch(replayConfig, token);
  }
}

async function execute<T, D, R>(
  request: HttpRequestConfig<D>,
  parse: (response: HttpResponse<T, D>) => R | Promise<R>,
): Promise<R> {
  // Registering a duplicate can synchronously run the previous request's abort handlers.
  const config = { ...request };
  const { url } = config;
  if (
    typeof url !== 'string' ||
    !url.startsWith('/') ||
    url.startsWith('//') ||
    /[\s\\]/u.test(url)
  ) {
    throw new TypeError('API 请求地址必须使用以 / 开头的相对路径');
  }
  const [pathname = ''] = url.split(/[?#]/u, 1);
  if (/(?:^|\/)(?:\.|%2e){1,2}(?=\/|$)/iu.test(pathname)) {
    throw new TypeError('API 请求路径不能包含 . 或 .. 路径段');
  }

  if (config.skipAuth !== true) useAuthStore.getState().syncSession();
  const { sessionVersion, accessToken } = useAuthStore.getState();
  const session = config.skipAuth === true ? undefined : { version: sessionVersion, accessToken };
  const method = config.method?.toUpperCase() ?? 'GET';
  const key = getRequestKey(config, method, session);
  const routeScoped =
    config.skipRouteCancel !== true &&
    config.signal === undefined &&
    (config.routeScoped ?? readMethods.has(method));
  const pending = trackRequest(config.signal, key, routeScoped);

  try {
    const response = await send<T, D>(config, method, pending.signal, session);
    assertActive(pending.signal, session);
    const result = await waitForRequest(Promise.resolve(parse(response)), pending.signal);
    assertActive(pending.signal, session);
    return result;
  } catch (error) {
    if (!isSessionExpiredError(error)) {
      if (!isCancel(error)) {
        assertActive(pending.signal, session);
        const capture = captureBlobErrorMessage(error);
        if (capture !== undefined) {
          await waitForRequest(capture, pending.signal);
          assertActive(pending.signal, session);
        }
        if (config.silent !== true && !isForbiddenError(error)) {
          notifyHttpError(getErrorMessage(error));
        }
      }
    }
    throw normalizeError(error);
  } finally {
    pending.release();
  }
}

function request<T = unknown, D = unknown>(
  config: HttpRequestConfig<D>,
  parse: ResponseParser<T, D> = (response) => getResponseParser()(response) as T | Promise<T>,
): Promise<T> {
  return execute<unknown, D, T>(config, parse);
}

function requestRaw<T = unknown, D = unknown>(
  config: HttpRequestConfig<D>,
): Promise<HttpResponse<T, D>> {
  return execute<T, D, HttpResponse<T, D>>(config, (response) => response);
}

type MethodConfig<D> = Omit<HttpRequestConfig<D>, 'data' | 'method' | 'url'>;

export const http = {
  request,
  requestRaw,
  get<T = unknown>(url: string, config?: MethodConfig<unknown>): Promise<T> {
    return request<T>({ ...config, method: 'get', url });
  },
  post<T = unknown, D = unknown>(url: string, data: D, config?: MethodConfig<D>): Promise<T> {
    return request<T, D>({ ...config, method: 'post', url, data });
  },
};
