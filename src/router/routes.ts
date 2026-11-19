import { createRootRoute, createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';

import { WorkbaseLayout } from '@/layout';
import { NotFoundPage, RouteErrorPage } from '@/router/RouteFeedback';

const rootRoute = createRootRoute({
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: WorkbaseLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/welcome', replace: true });
  },
});

const welcomeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/welcome',
  component: lazyRouteComponent(() => import('@/pages/welcome'), 'WorkbenchPage'),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: lazyRouteComponent(() => import('@/pages/login'), 'LoginPage'),
});

const richTextEditorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/rich-text-editor',
  component: lazyRouteComponent(() => import('@/pages/rich-text-editor'), 'RichTextEditorPage'),
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  appRoute.addChildren([welcomeRoute, richTextEditorRoute]),
  loginRoute,
]);
