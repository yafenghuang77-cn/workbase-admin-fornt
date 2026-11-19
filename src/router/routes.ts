import { createRootRoute, createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';

import WelcomePage from '@/pages/welcome';
import { NotFoundPage, RouteErrorPage } from '@/router/RouteFeedback';

const rootRoute = createRootRoute({
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WelcomePage,
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
  getParentRoute: () => rootRoute,
  path: '/rich-text-editor',
  component: lazyRouteComponent(() => import('@/pages/rich-text-editor'), 'RichTextEditorPage'),
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  welcomeRoute,
  loginRoute,
  richTextEditorRoute,
]);
