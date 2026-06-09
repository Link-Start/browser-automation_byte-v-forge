import { QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { createBrowserQueryClient } from './api/query-client';
import { router } from './routes/router';
import '@radix-ui/themes/styles.css';
import './styles.css';

const root = document.getElementById('root');
const client = createBrowserQueryClient();

if (!root) {
  throw new Error('root element not found');
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <Theme accentColor="orange" appearance="dark" grayColor="slate" panelBackground="translucent" radius="large">
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  </StrictMode>
);
