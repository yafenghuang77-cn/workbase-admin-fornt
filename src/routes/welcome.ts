import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/welcome')({
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
});
