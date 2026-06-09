import { Navigate, createBrowserRouter } from 'react-router';
import { AppRouteError } from './app-route-error';
import { AppShell } from './app-shell';
import { paths } from './paths';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    errorElement: <AppRouteError />,
    children: [
      { index: true, lazy: homeRoute },
      {
        path: 'sessions',
        children: [
          { index: true, lazy: homeRoute },
          { path: ':sessionId', lazy: homeRoute }
        ]
      },
      { path: 'live/:token', lazy: liveViewRoute },
      { path: '*', element: <Navigate replace to={paths.home} /> }
    ]
  }
]);

async function homeRoute() {
  return { Component: (await import('./home-route')).HomeRoute };
}

async function liveViewRoute() {
  return { Component: (await import('./live-view-route')).LiveViewRoute };
}
