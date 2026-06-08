import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { createBrowserQueryClient } from './api/query-client';
import { router } from './routes/router';
import './styles.css';

const root = document.getElementById('root');
const client = createBrowserQueryClient();

if (!root) {
  throw new Error('root element not found');
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
