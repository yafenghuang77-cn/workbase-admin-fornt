import { createRootRoute, createRouter } from '@tanstack/react-router';

import { registerRoutes } from './register-routes';
import { NotFoundPage, RouteErrorPage } from './RouteFeedback';
import { routeConfig } from './routes';

const rootRoute = createRootRoute({
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});

export const routeTree = rootRoute.addChildren(registerRoutes(rootRoute, routeConfig));

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
