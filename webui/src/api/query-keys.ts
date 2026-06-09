export const browserQueryKeys = {
  sessions: ['browser-sessions'] as const,
  liveView: (sessionId: string) => ['browser-live-view', sessionId] as const,
  tasks: (sessionId: string) => ['browser-tasks', sessionId] as const
};
