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
          {
            path: ':sessionId',
            lazy: sessionRouteLayout,
            children: [
              { index: true, element: <SessionLiveRedirect /> },
              { path: 'live', lazy: sessionLiveRoute },
              { path: 'commands', lazy: sessionCommandsRoute },
              { path: 'tasks', lazy: sessionTasksRoute }
            ]
          }
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

async function sessionRouteLayout() {
  return { Component: (await import('./session-route-layout')).SessionRouteLayout };
}

async function sessionLiveRoute() {
  return { Component: (await import('./session-live-route')).SessionLiveRoute };
}

async function sessionCommandsRoute() {
  return { Component: (await import('./session-commands-route')).SessionCommandsRoute };
}

async function sessionTasksRoute() {
  return { Component: (await import('./session-tasks-route')).SessionTasksRoute };
}

function SessionLiveRedirect() {
  return <Navigate replace to="live" />;
}
