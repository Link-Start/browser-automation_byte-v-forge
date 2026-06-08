import { Navigate, createBrowserRouter } from 'react-router';
import { AppShell } from './app-shell';
import { LiveViewRoute } from './live-view-route';
import { NewSessionRoute } from './new-session-route';
import { OpenSessionRoute } from './open-session-route';
import { SessionCommandsRoute } from './session-commands-route';
import { SessionLiveRoute } from './session-live-route';
import { SessionTasksRoute } from './session-tasks-route';
import { paths } from './paths';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, element: <Navigate replace to={paths.newSession} /> },
      {
        path: 'sessions',
        children: [
          { index: true, element: <Navigate replace to={paths.newSession} /> },
          { path: 'new', Component: NewSessionRoute },
          { path: 'open', Component: OpenSessionRoute },
          { path: ':sessionId', element: <SessionLiveRedirect /> },
          { path: ':sessionId/live', Component: SessionLiveRoute },
          { path: ':sessionId/commands', Component: SessionCommandsRoute },
          { path: ':sessionId/tasks', Component: SessionTasksRoute }
        ]
      },
      { path: 'live/:token', Component: LiveViewRoute },
      { path: '*', element: <Navigate replace to={paths.newSession} /> }
    ]
  }
]);

function SessionLiveRedirect() {
  return <Navigate replace to="live" />;
}
