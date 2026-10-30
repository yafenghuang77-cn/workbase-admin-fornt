import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { queryClient } from './query-client';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root was not found');
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div>这个是一个vite8+react19+ts7的前端工程</div>
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  </StrictMode>,
);
