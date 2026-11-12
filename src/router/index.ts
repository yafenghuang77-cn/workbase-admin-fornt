import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';
import { cancelRouteRequests } from '@/utils/http/cancel';

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

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
