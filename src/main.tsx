import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';

import { AppProviders } from './providers/AppProviders';
import { router } from './router';
import { watchAuthSession } from './stores/auth';
import { setSessionExpiredHandler } from './utils/http/refresh';

import './styles/global.less';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root was not found');
}

const stopAuthSessionSync = watchAuthSession();
import.meta.hot?.dispose(stopAuthSessionSync);

setSessionExpiredHandler(() => {
  router.navigate({ to: '/login', replace: true }).catch(console.error);
});

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </AppProviders>
  </StrictMode>,
);
