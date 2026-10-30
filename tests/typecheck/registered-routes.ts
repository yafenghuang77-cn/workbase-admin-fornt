import type { NavigateOptions } from '@tanstack/react-router';
import { createRootRoute, createRouter } from '@tanstack/react-router';

import { registerRoutes } from '@/router/register-routes';

// Compiled by the project's tests/tsconfig.json; deliberately never executed.
// Each negative case must remain a TypeScript error, or @ts-expect-error fails.
export function verifyRegisteredRouteTypes() {
  const rootRoute = createRootRoute();
  const routes = registerRoutes(rootRoute, [
    { path: '/welcome', name: '欢迎' },
    {
      path: '/users',
      name: '用户',
      children: [{ path: '/users/$userId', name: '用户详情' }],
    },
  ] as const);
  const router = createRouter({ routeTree: rootRoute.addChildren(routes) });

  type StaticOptions = NavigateOptions<typeof router, string, '/welcome'>;
  type GroupOptions = NavigateOptions<typeof router, string, '/users'>;
  type DetailOptions = NavigateOptions<typeof router, string, '/users/$userId'>;
  type UnknownOptions = NavigateOptions<typeof router, string, '/missing'>;

  const welcome: StaticOptions = { to: '/welcome' };
  const users: GroupOptions = { to: '/users' };
  const details: DetailOptions = { to: '/users/$userId', params: { userId: '42' } };

  // @ts-expect-error Dynamic route parameters must be provided.
  const missingParams: DetailOptions = { to: '/users/$userId' };
  // @ts-expect-error Parameters must belong to the target route.
  const wrongParams: DetailOptions = { to: '/users/$userId', params: { wrongId: '42' } };
  // @ts-expect-error Unknown route paths must remain invalid.
  const unknownPath: UnknownOptions = { to: '/missing' };

  return { router, welcome, users, details, missingParams, wrongParams, unknownPath };
}
