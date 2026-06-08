import { QueryClient } from '@tanstack/react-query';

export function createBrowserQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false
      },
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 10_000
      }
    }
  });
}
