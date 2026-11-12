import { CanceledError } from 'axios';

const pendingRequests = new Map<string, AbortController>();
const routeRequests = new Set<AbortController>();

export function trackRequest(
  callerSignal: AbortSignal | undefined,
  key: string | undefined,
  routeScoped: boolean,
) {
  const controller = new AbortController();
  const cancel = () => controller.abort();

  if (callerSignal?.aborted === true) throw new CanceledError('请求已取消');
  callerSignal?.addEventListener('abort', cancel, { once: true });
  if (key !== undefined) {
    const previous = pendingRequests.get(key);
    pendingRequests.set(key, controller);
    previous?.abort();
  }
  if (routeScoped) routeRequests.add(controller);

  return {
    signal: controller.signal,
    release() {
      callerSignal?.removeEventListener('abort', cancel);
      if (key !== undefined && pendingRequests.get(key) === controller) pendingRequests.delete(key);
      if (routeScoped) routeRequests.delete(controller);
    },
  };
}

export function cancelRouteRequests(): void {
  const requests = [...routeRequests];
  routeRequests.clear();
  for (const controller of requests) controller.abort();
}

export async function waitForRequest<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  let abort: (() => void) | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      abort = () => reject(new CanceledError('请求已取消'));
      promise.then(resolve, reject).catch(reject);
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    });
  } finally {
    if (abort !== undefined) signal.removeEventListener('abort', abort);
  }
}
