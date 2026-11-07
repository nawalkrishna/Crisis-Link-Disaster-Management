import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router/dom';
import { ToastProvider } from './components/toast';
import { persistOptions, queryClient } from './lib/query-client';
import './lib/offline'; // registers how queued offline writes are sent - before the cache is restored
import { router } from './router';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    {/* Like QueryClientProvider, plus: restore the saved cache from IndexedDB on start-up
        and keep saving it. Then send any writes that were queued while offline. */}
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
      {/* Devtools panel (bottom corner) to inspect the cache; stripped from production builds. */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </PersistQueryClientProvider>
  </StrictMode>,
);
