import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';
import { cancelRouteRequests } from '@/utils/http/cancel';

import { watchRouterSession } from './session';

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  defaultPendingComponent: () => null,
  scrollRestoration: true,
});

const stopRouterSessionSync = watchRouterSession(router);
import.meta.hot?.dispose(stopRouterSessionSync);

router.subscribe('onBeforeLoad', ({ fromLocation, pathChanged }) => {
  if (fromLocation !== undefined && pathChanged) {
    cancelRouteRequests();
  }
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
