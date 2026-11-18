import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  defaultPendingComponent: () => null,
  scrollRestoration: true,
});

router.subscribe('onBeforeLoad', () => {});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
