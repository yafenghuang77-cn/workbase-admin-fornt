import { createRootRoute } from '@tanstack/react-router';

import { NotFoundPage, RouteErrorPage } from '@/router/RouteFeedback';

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});
