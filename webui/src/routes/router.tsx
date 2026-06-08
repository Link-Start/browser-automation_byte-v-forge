import { createBrowserRouter } from 'react-router';
import { AppShell } from './app-shell';
import { BrowserConsoleRoute } from './browser-console-route';
import { LiveViewRoute } from './live-view-route';
import { SessionRedirectRoute } from './session-redirect-route';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, Component: SessionRedirectRoute },
      { path: 'sessions', Component: BrowserConsoleRoute },
      { path: 'sessions/:sessionId', Component: BrowserConsoleRoute },
      { path: 'live/:token', Component: LiveViewRoute },
      { path: '*', Component: SessionRedirectRoute }
    ]
  }
]);
