import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: lazyRouteComponent(() => import('@/pages/login'), 'LoginPage'),
});
