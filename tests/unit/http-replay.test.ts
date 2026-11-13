import type { AxiosAdapter } from 'axios';
import { AxiosError, AxiosHeaders } from 'axios';
import { http as mockHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';

import { useAuthStore } from '@/stores/auth';
import { http } from '@/utils/http';

const oldTokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
const refreshedTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(async () => {
  await useAuthStore.getState().setTokens(oldTokens);
});

afterEach(async () => {
  server.resetHandlers();
  await useAuthStore.getState().clearTokens();
  localStorage.removeItem('workbase-auth');
});

afterAll(() => {
  server.close();
});

function holdRefresh() {
  let markStarted: (() => void) | undefined;
  let release: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    mockHttp.post('*/auth/refresh', async () => {
      markStarted?.();
      await gate;
      return HttpResponse.json({ data: refreshedTokens });
    }),
  );
  return { started, finish: () => release?.() };
}

function authorized(request: Request) {
  return request.headers.get('authorization') === `Bearer ${refreshedTokens.accessToken}`;
}

function adapterResponse(config: Parameters<AxiosAdapter>[0], data: string) {
  const authorized =
    config.headers.get('Authorization') === `Bearer ${refreshedTokens.accessToken}`;
  const response = {
    config,
    data: { data },
    status: authorized ? 200 : 401,
    statusText: authorized ? 'OK' : 'Unauthorized',
    headers: {},
  };
  if (!authorized) {
    throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, response);
  }
  return response;
}

test('重放保留首次发送的嵌套 JSON、查询参数和业务请求头', async () => {
  const refresh = holdRefresh();
  const sent: Array<{ body: unknown; page: string | null; requestId: string | null }> = [];
  server.use(
    mockHttp.post('*/replay/orders', async ({ request }) => {
      sent.push({
        body: await request.json(),
        page: new URL(request.url).searchParams.get('page'),
        requestId: request.headers.get('x-request-id'),
      });
      return authorized(request)
        ? HttpResponse.json({ data: 'saved' })
        : new HttpResponse(null, { status: 401 });
    }),
  );

  const item = { amount: 10 };
  const params = { page: 1 };
  const headers = new AxiosHeaders({ 'X-Request-ID': 'original' });
  const pending = http.post(
    '/replay/orders',
    { items: [item] },
    {
      params,
      headers,
      replayOnUnauthorized: true,
    },
  );
  await Promise.race([refresh.started, pending]);
  item.amount = 100;
  params.page = 2;
  headers.set('X-Request-ID', 'mutated');
  refresh.finish();

  await expect(pending).resolves.toBe('saved');
  const original = { body: { items: [{ amount: 10 }] }, page: '1', requestId: 'original' };
  expect(sent).toEqual([original, original]);
});

test('重放保留 FormData 的文件、重复字段和 URLSearchParams', async () => {
  const refresh = holdRefresh();
  const sent: Array<{ fileName: string | null; tags: FormDataEntryValue[]; page: string | null }> =
    [];
  const adapter: AxiosAdapter = async (config) => {
    const form: unknown = config.data;
    const params: unknown = config.params;
    if (!(form instanceof FormData) || !(params instanceof URLSearchParams)) {
      throw new Error('请求需要 FormData 与 URLSearchParams');
    }
    const file = form.get('file');
    sent.push({
      fileName: file !== null && typeof file !== 'string' ? file.name : null,
      tags: form.getAll('tag'),
      page: params.get('page'),
    });
    return adapterResponse(config, 'uploaded');
  };

  const form = new FormData();
  form.append('file', new File(['original'], 'original.txt'));
  form.append('tag', 'first');
  form.append('tag', 'second');
  const params = new URLSearchParams({ page: '1' });
  const pending = http.post('/replay/files', form, { params, adapter, replayOnUnauthorized: true });
  await Promise.race([refresh.started, pending]);
  form.set('file', new File(['changed'], 'changed.txt'));
  form.delete('tag');
  params.set('page', '2');
  refresh.finish();

  await expect(pending).resolves.toBe('uploaded');
  const original = { fileName: 'original.txt', tags: ['first', 'second'], page: '1' };
  expect(sent).toEqual([original, original]);
});

test.each(['当前页面', 'iframe'])('重放保留%s中原生表单的初始字段', async (scope) => {
  const refresh = holdRefresh();
  const sent: FormDataEntryValue[][] = [];
  const adapter: AxiosAdapter = async (config) => {
    const data: unknown = config.data;
    if (!(data instanceof FormData)) throw new Error('请求需要 FormData');
    sent.push(data.getAll('amount'));
    return adapterResponse(config, 'saved');
  };
  const frame = scope === 'iframe' ? document.createElement('iframe') : undefined;
  if (frame !== undefined) document.body.append(frame);

  try {
    const owner = frame === undefined ? document : frame.contentDocument;
    if (owner === null) throw new Error('无法获取 iframe 的文档');
    const form = owner.createElement('form');
    const amount = owner.createElement('input');
    amount.name = 'amount';
    amount.value = '10';
    form.append(amount);

    const pending = http.post('/replay/native-form', form, { adapter, replayOnUnauthorized: true });
    await Promise.race([refresh.started, pending]);
    amount.value = '100';
    refresh.finish();

    await expect(pending).resolves.toBe('saved');
    expect(sent).toEqual([['10'], ['10']]);
  } finally {
    frame?.remove();
  }
});

test('含自定义请求转换的原生表单保持初次派发的类型并跳过重放', async () => {
  const refresh = holdRefresh();
  const form = document.createElement('form');
  const inputs: unknown[] = [];
  const adapter: AxiosAdapter = async (config) => adapterResponse(config, 'saved');
  const pending = http.post('/replay/custom-form', form, {
    adapter,
    replayOnUnauthorized: true,
    transformRequest: (body: unknown) => {
      inputs.push(body);
      return 'serialized';
    },
  });
  const result = Promise.allSettled([pending]);
  await Promise.race([refresh.started, result]);
  refresh.finish();

  await expect(result).resolves.toMatchObject([
    { status: 'rejected', reason: { response: { status: 401 } } },
  ]);
  expect(inputs).toEqual([form]);
});

test('重放再次运行自定义转换并保留二进制视图的原始缓冲区', async () => {
  const refresh = holdRefresh();
  const inputs: Array<{ bytes: number[]; offset: number }> = [];
  const data = new Uint8Array([1, 2, 3, 4]).subarray(1, 3);
  const adapter: AxiosAdapter = async (config) => adapterResponse(config, 'saved');
  const pending = http.post('/replay/binary', data, {
    adapter,
    replayOnUnauthorized: true,
    transformRequest: (body: unknown) => {
      if (!(body instanceof Uint8Array)) throw new Error('请求需要 Uint8Array');
      inputs.push({ bytes: [...new Uint8Array(body.buffer)], offset: body.byteOffset });
      body[0] = 99;
      return body.buffer;
    },
  });
  await Promise.race([refresh.started, pending]);
  data[0] = 10;
  refresh.finish();

  await expect(pending).resolves.toBe('saved');
  const original = { bytes: [1, 2, 3, 4], offset: 1 };
  expect(inputs).toEqual([original, original]);
});
