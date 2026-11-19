import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  // notFound,
  redirect,
} from '@tanstack/react-router';

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

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/pages/workbench'), 'WorkbenchPage'),
});

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/welcome',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
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

const resourcesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/resources',
  component: lazyRouteComponent(() => import('@/pages/welcome')),
});

export const routeTree = rootRoute.addChildren([
  appRoute.addChildren([homeRoute, richTextEditorRoute, resourcesRoute]),
  welcomeRoute,
  loginRoute,
]);
