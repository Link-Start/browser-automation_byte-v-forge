import { Navigate, createBrowserRouter } from 'react-router';
import { AppRouteError } from './app-route-error';
import { AppShell } from './app-shell';
import { HomeRoute } from './home-route';
import { LiveViewRoute } from './live-view-route';
import { NewSessionRoute } from './new-session-route';
import { SessionCommandsRoute } from './session-commands-route';
import { SessionLiveRoute } from './session-live-route';
import { SessionRouteLayout } from './session-route-layout';
import { SessionTasksRoute } from './session-tasks-route';
import { paths } from './paths';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    errorElement: <AppRouteError />,
    children: [
      { index: true, Component: HomeRoute },
      {
        path: 'sessions',
        children: [
          { index: true, Component: HomeRoute },
          { path: 'new', Component: NewSessionRoute },
          {
            path: ':sessionId',
            Component: SessionRouteLayout,
            children: [
              { index: true, element: <SessionLiveRedirect /> },
              { path: 'live', Component: SessionLiveRoute },
              { path: 'commands', Component: SessionCommandsRoute },
              { path: 'tasks', Component: SessionTasksRoute }
            ]
          }
        ]
      },
      { path: 'live/:token', Component: LiveViewRoute },
      { path: '*', element: <Navigate replace to={paths.home} /> }
    ]
  }
]);

function SessionLiveRedirect() {
  return <Navigate replace to="live" />;
}
