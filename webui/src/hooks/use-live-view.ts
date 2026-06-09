import { useQuery } from '@tanstack/react-query';
import { createLiveView } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import type { BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';
import { useBrowserLiveRTC } from './use-browser-live-rtc';
import type { LiveViewState } from './live-view-state';

export function useLiveView(sessionId: string): LiveViewState {
  const liveView = useQuery({
    enabled: Boolean(sessionId),
    queryFn: () => createSessionLiveView(sessionId),
    queryKey: browserQueryKeys.liveView(sessionId),
    retry: 1,
    staleTime: 60_000
  });
  const rtc = useBrowserLiveRTC(liveView.data?.webrtc_url || '');
  return { ...rtc, error: liveView.error?.message || rtc.error, view: liveView.data };
}

export function useLiveViewToken(token: string): LiveViewState {
  return useBrowserLiveRTC(token ? `/api/browser-automation/live/${encodeURIComponent(token)}/webrtc/answer` : '');
}

async function createSessionLiveView(sessionId: string): Promise<BrowserLiveView> {
  const response = await createLiveView(sessionId);
  const liveView = response.live_view;
  if (!liveView?.webrtc_url) {
    throw new Error(response.error?.message || 'WebRTC live view is unavailable');
  }
  return liveView;
}
