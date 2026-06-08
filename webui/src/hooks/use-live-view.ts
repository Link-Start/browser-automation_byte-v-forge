import { useQuery } from '@tanstack/react-query';
import { createLiveView, liveViewWebSocketPath } from '../api/browser-api';
import type { BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';
import { type LiveViewState, useBrowserLiveSocket } from './use-browser-live-socket';

export function useLiveView(sessionId: string): LiveViewState {
  const liveView = useQuery({
    enabled: Boolean(sessionId),
    queryFn: () => createSessionLiveView(sessionId),
    queryKey: ['browser-live-view', sessionId],
    retry: 1,
    staleTime: 60_000
  });
  const socket = useBrowserLiveSocket(liveView.data?.websocket_url || '');
  return { ...socket, error: liveView.error?.message || socket.error, view: liveView.data };
}

export function useLiveViewToken(token: string): LiveViewState {
  return useBrowserLiveSocket(token ? liveViewWebSocketPath(token) : '');
}

async function createSessionLiveView(sessionId: string): Promise<BrowserLiveView> {
  const response = await createLiveView(sessionId);
  const liveView = response.live_view;
  if (!liveView?.websocket_url) {
    throw new Error(response.error?.message || 'live view is unavailable');
  }
  return liveView;
}
