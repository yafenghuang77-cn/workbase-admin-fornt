import type {
  MutationFunction,
  MutationFunctionContext,
  QueryClientConfig,
  QueryFunction,
} from '@tanstack/react-query';
import {
  focusManager,
  isCancelledError,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { CanceledError, isAxiosError, isCancel } from 'axios';

import { useAuthStore } from '@/stores/auth';
import { getErrorMessage, isForbiddenError } from '@/utils/http/error';
import { notifyHttpError } from '@/utils/http/notify';
import { isSessionExpiredError } from '@/utils/http/refresh';

function shouldRetryQuery(failureCount: number, error: Error): boolean {
  // 最多重试两次；取消、业务异常和程序错误不应自动重放。
  if (failureCount >= 2 || isCancel(error) || !isAxiosError<unknown, unknown>(error)) {
    return false;
  }

  const status = error.response?.status;
  if (status !== undefined) {
    // 401/403 交给认证/权限流程；429 需按接口限流契约处理。
    return [408, 500, 502, 503, 504].includes(status);
  }

  return ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '');
}

function notifyQueryError(error: Error, meta: Record<string, unknown> | undefined): void {
  if (
    meta?.['silent'] === true ||
    isCancel(error) ||
    isCancelledError(error) ||
    isForbiddenError(error) ||
    isSessionExpiredError(error)
  ) {
    return;
  }

  notifyHttpError(getErrorMessage(error));
}

type MutationDefaults = NonNullable<Parameters<QueryClient['defaultMutationOptions']>[0]>;
type MutationTask = MutationFunction<unknown, never>;
type MutationRetry = (failureCount: number, error: Error) => boolean;
type QueryTask = QueryFunction<unknown, never>;

class SessionQueryClient extends QueryClient {
  readonly #sessionVersion: number;
  readonly #sessionController = new AbortController();
  readonly #guardedMutations = new WeakMap<MutationTask, MutationTask>();
  readonly #guardedMutationRetries = new WeakMap<MutationRetry, MutationRetry>();
  readonly #guardedQueries = new WeakMap<QueryTask, QueryTask>();

  constructor(sessionVersion: number, config: QueryClientConfig) {
    super(config);
    this.#sessionVersion = sessionVersion;
  }

  getSessionSignal(): AbortSignal {
    const { signal } = this.#sessionController;
    if (signal.aborted) return signal;

    useAuthStore.getState().syncSession();
    if (useAuthStore.getState().sessionVersion !== this.#sessionVersion) {
      this.#sessionController.abort();
    }
    return signal;
  }

  retire(): void {
    const mutationCache = this.getMutationCache();
    const pending = new Map(
      mutationCache
        .getAll()
        .filter(({ state }) => state.status === 'pending')
        .map((mutation) => [mutation.mutationId, mutation]),
    );
    this.#sessionController.abort();
    this.clear();
    if (pending.size === 0) return;

    // 清空缓存不会结束暂停的 Mutation。网络或焦点恢复时唤醒它，让会话检查结束提交。
    function resumePaused(ready = true): void {
      if (!ready) return;
      for (const mutation of pending.values()) {
        if (mutation.state.isPaused) void mutation.continue().catch(() => undefined);
      }
    }

    const stopOnline = onlineManager.subscribe(resumePaused);
    const stopFocus = focusManager.subscribe(resumePaused);
    const stopCache = mutationCache.subscribe((event) => {
      if (event.type !== 'updated') return;
      const { mutationId } = event.mutation;
      const mutation = pending.get(mutationId);
      if (mutation === undefined) return;
      if (mutation.state.status === 'pending') {
        // onMutate 或重试延迟可能在会话切换后才结束。
        if (event.action.type === 'pause') void mutation.continue().catch(() => undefined);
        return;
      }

      pending.delete(mutationId);
      if (pending.size === 0) {
        stopOnline();
        stopFocus();
        stopCache();
      }
    });
    resumePaused();
  }

  #assertActive = (): void => {
    if (this.getSessionSignal().aborted) {
      throw new CanceledError('会话已切换，操作已取消');
    }
  };

  override defaultQueryOptions: QueryClient['defaultQueryOptions'] = (options) => {
    const defaulted = super.defaultQueryOptions(options);
    const { queryFn } = defaulted;
    if (typeof queryFn !== 'function') return defaulted;

    // 同一个原始函数始终复用同一个包装，并保留 Query 上下文中按需读取的 signal。
    let guarded = this.#guardedQueries.get(queryFn) as typeof queryFn | undefined;
    if (guarded === undefined) {
      guarded = (context) => {
        this.#assertActive();
        return queryFn(context);
      };
      this.#guardedQueries.set(queryFn, guarded);
      this.#guardedQueries.set(guarded, guarded);
    }

    return guarded === queryFn ? defaulted : { ...defaulted, queryFn: guarded };
  };

  override defaultMutationOptions<T extends MutationDefaults>(options?: T): T {
    const defaults = super.defaultMutationOptions(options);
    const defaulted = this.#sessionController.signal.aborted
      ? { ...defaults, onMutate: this.#assertActive }
      : defaults;
    const mutationFn: MutationTask | undefined = defaulted.mutationFn;
    if (mutationFn === undefined) return defaulted;

    let guarded = this.#guardedMutations.get(mutationFn);
    if (guarded === undefined) {
      // Observer option updates also pass through here while onMutate is pending.
      guarded = (variables, context) => {
        this.#assertActive();
        return mutationFn(variables, context);
      };
      this.#guardedMutations.set(mutationFn, guarded);
      this.#guardedMutations.set(guarded, guarded);
    }

    const guardedOptions =
      guarded === mutationFn ? defaulted : { ...defaulted, mutationFn: guarded };
    const { retry } = guardedOptions;
    if (!retry) return guardedOptions;

    let guardedRetry =
      typeof retry === 'function' ? this.#guardedMutationRetries.get(retry) : undefined;
    if (guardedRetry === undefined) {
      guardedRetry = (failureCount, error) =>
        !this.#sessionController.signal.aborted &&
        (typeof retry === 'function'
          ? retry(failureCount, error)
          : retry === true || failureCount < retry);
      if (typeof retry === 'function') this.#guardedMutationRetries.set(retry, guardedRetry);
      this.#guardedMutationRetries.set(guardedRetry, guardedRetry);
    }

    return guardedRetry === retry ? guardedOptions : { ...guardedOptions, retry: guardedRetry };
  }
}

export function getMutationSessionSignal({ client }: MutationFunctionContext): AbortSignal {
  if (!(client instanceof SessionQueryClient)) {
    throw new TypeError('Mutation 需要使用应用会话的 QueryClient');
  }
  return client.getSessionSignal();
}

function createQueryClient(sessionVersion: number): SessionQueryClient {
  function notifyIfActive(error: Error, meta: Record<string, unknown> | undefined): void {
    if (!client.getSessionSignal().aborted) notifyQueryError(error, meta);
  }

  const client = new SessionQueryClient(sessionVersion, {
    queryCache: new QueryCache({
      onError: (error, query) => notifyIfActive(error, query.meta),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) =>
        notifyIfActive(error, mutation.meta),
    }),
    defaultOptions: {
      queries: {
        // 数据新鲜度与无订阅缓存回收是两项独立策略，可由业务 queryOptions 覆盖。
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        networkMode: 'online',
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
        throwOnError: isForbiddenError,
      },
      mutations: {
        // 创建、审批等写操作可能已在服务端成功，重试须先约定幂等机制。
        retry: false,
        networkMode: 'online',
        throwOnError: isForbiddenError,
      },
    },
  });
  return client;
}

export let queryClient = createQueryClient(useAuthStore.getState().sessionVersion);

const stopQuerySessionSync = useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) {
    const previousClient = queryClient;
    queryClient = createQueryClient(state.sessionVersion);
    previousClient.retire();
  }
});
import.meta.hot?.dispose(stopQuerySessionSync);
