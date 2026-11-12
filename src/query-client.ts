import type { MutationFunction, QueryClientConfig } from '@tanstack/react-query';
import { isCancelledError, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
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

class SessionQueryClient extends QueryClient {
  readonly #sessionVersion: number;
  readonly #guardedMutations = new WeakMap<MutationTask, MutationTask>();

  constructor(sessionVersion: number, config: QueryClientConfig) {
    super(config);
    this.#sessionVersion = sessionVersion;
  }

  override defaultMutationOptions<T extends MutationDefaults>(options?: T): T {
    const defaulted = super.defaultMutationOptions(options);
    const mutationFn: MutationTask | undefined = defaulted.mutationFn;
    if (mutationFn === undefined) return defaulted;

    let guarded = this.#guardedMutations.get(mutationFn);
    if (guarded === undefined) {
      // Observer option updates also pass through here while onMutate is pending.
      guarded = (variables, context) => {
        useAuthStore.getState().syncSession();
        if (useAuthStore.getState().sessionVersion !== this.#sessionVersion) {
          throw new CanceledError('会话已切换，操作已取消');
        }
        return mutationFn(variables, context);
      };
      this.#guardedMutations.set(mutationFn, guarded);
      this.#guardedMutations.set(guarded, guarded);
    }

    return guarded === mutationFn ? defaulted : { ...defaulted, mutationFn: guarded };
  }
}

function createQueryClient(sessionVersion: number): QueryClient {
  return new SessionQueryClient(sessionVersion, {
    queryCache: new QueryCache({
      onError: (error, query) => notifyQueryError(error, query.meta),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) =>
        notifyQueryError(error, mutation.meta),
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
}

export let queryClient = createQueryClient(useAuthStore.getState().sessionVersion);

const stopQuerySessionSync = useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) {
    const previousClient = queryClient;
    queryClient = createQueryClient(state.sessionVersion);
    previousClient.clear();
  }
});
import.meta.hot?.dispose(stopQuerySessionSync);
