import { QueryClient } from '@tanstack/react-query';
import { isAxiosError, isCancel } from 'axios';

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

// 客户端应用共用一个缓存实例，避免组件重新渲染时重建。
export const queryClient = new QueryClient({
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
    },
    mutations: {
      // 创建、审批等写操作可能已在服务端成功，重试须先约定幂等机制。
      retry: false,
      networkMode: 'online',
    },
  },
});
