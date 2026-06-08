export const paths = {
  home: '/',
  live: (token: string) => `/live/${encodeURIComponent(token)}`,
  liveSocket: (token: string) => `/ws/browser-automation/live/${encodeURIComponent(token)}`,
  sessions: '/sessions',
  newSession: '/sessions/new',
  session: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}`,
  sessionCommands: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/commands`,
  sessionLive: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/live`,
  sessionTasks: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/tasks`
};
