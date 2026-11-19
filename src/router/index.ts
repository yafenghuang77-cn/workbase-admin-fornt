import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/router/routes';

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  defaultPendingComponent: () => null,
  scrollRestoration: true,
  scrollToTopSelectors: ['#workbase-content'],
});

router.subscribe('onBeforeLoad', () => {});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
