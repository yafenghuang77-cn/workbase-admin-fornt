import type { AnyRouter } from '@tanstack/react-router';

import { useAuthStore } from '@/stores/auth';

export function watchRouterSession(
  router: Pick<AnyRouter, 'clearCache' | 'invalidate'>,
): () => void {
  return useAuthStore.subscribe((state, previous) => {
    if (state.sessionVersion === previous.sessionVersion) return;

    router.clearCache();
    router.invalidate({ forcePending: true, sync: true }).catch(console.error);
  });
}
