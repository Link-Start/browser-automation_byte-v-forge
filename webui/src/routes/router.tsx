import { Navigate, createBrowserRouter } from 'react-router';
import { AppShell } from './app-shell';
import { LiveViewRoute } from './live-view-route';
import { NewSessionRoute } from './new-session-route';
import { SessionCommandsRoute } from './session-commands-route';
import { SessionLiveRoute } from './session-live-route';
import { SessionTasksRoute } from './session-tasks-route';
import { SessionsHomeRoute } from './sessions-home-route';
import { paths } from './paths';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, element: <Navigate replace to={paths.newSession} /> },
      { path: 'sessions', Component: SessionsHomeRoute },
      { path: 'sessions/new', Component: NewSessionRoute },
      { path: 'sessions/:sessionId', element: <SessionLiveRedirect /> },
      { path: 'sessions/:sessionId/live', Component: SessionLiveRoute },
      { path: 'sessions/:sessionId/commands', Component: SessionCommandsRoute },
      { path: 'sessions/:sessionId/tasks', Component: SessionTasksRoute },
      { path: 'live/:token', Component: LiveViewRoute },
      { path: '*', element: <Navigate replace to={paths.sessions} /> }
    ]
  }
]);

function SessionLiveRedirect() {
  return <Navigate replace to="live" />;
}
