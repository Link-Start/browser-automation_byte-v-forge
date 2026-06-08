export const browserQueryKeys = {
  liveView: (sessionId: string) => ['browser-live-view', sessionId] as const,
  tasks: (sessionId: string) => ['browser-tasks', sessionId] as const
};
