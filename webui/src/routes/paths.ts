export const paths = {
  home: '/',
  live: (token: string) => `/live/${encodeURIComponent(token)}`,
  liveSocket: (token: string) => `/ws/browser-automation/live/${encodeURIComponent(token)}`,
  sessions: '/sessions',
  session: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}`
};
