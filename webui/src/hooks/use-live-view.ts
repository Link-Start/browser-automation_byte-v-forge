import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createLiveView } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import type { BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';
import { useBrowserLiveSocket } from './use-browser-live-socket';
import { useBrowserLiveRTC } from './use-browser-live-rtc';
import type { LiveViewState } from './live-view-state';

const liveFallbackDelayMs = 8_000;

export function useLiveView(sessionId: string): LiveViewState {
  const liveView = useQuery({
    enabled: Boolean(sessionId),
    queryFn: () => createSessionLiveView(sessionId),
    queryKey: browserQueryKeys.liveView(sessionId),
    retry: 1,
    staleTime: 60_000
  });
  return useLiveTransport(liveView.data, liveView.error?.message);
}

export function useLiveViewToken(token: string): LiveViewState {
  const encoded = encodeURIComponent(token);
  return useLiveTransport(token ? { websocket_url: `/ws/browser-automation/live/${encoded}`, webrtc_url: `/api/browser-automation/live/${encoded}/webrtc/answer` } : undefined);
}

async function createSessionLiveView(sessionId: string): Promise<BrowserLiveView> {
  const response = await createLiveView(sessionId);
  const liveView = response.live_view;
  if (!liveView?.webrtc_url) {
    throw new Error(response.error?.message || 'WebRTC live view is unavailable');
  }
  return liveView;
}

function useLiveTransport(view?: Pick<BrowserLiveView, 'websocket_url' | 'webrtc_url'>, setupError?: string): LiveViewState {
  const [fallback, setFallback] = useState(false);
  const webrtcPath = view?.webrtc_url || '';
  const websocketPath = view?.websocket_url || '';
  const rtc = useBrowserLiveRTC(fallback ? '' : webrtcPath);
  const socket = useBrowserLiveSocket(fallback ? websocketPath : '');

  useEffect(() => {
    setFallback(false);
  }, [webrtcPath, websocketPath]);

  useEffect(() => {
    if (!webrtcPath || !websocketPath || fallback || rtc.connected) return;
    const timer = globalThis.setTimeout(() => setFallback(true), liveFallbackDelayMs);
    return () => globalThis.clearTimeout(timer);
  }, [fallback, rtc.connected, websocketPath, webrtcPath]);

  useEffect(() => {
    if (rtc.error && websocketPath) setFallback(true);
  }, [rtc.error, websocketPath]);

  const active = fallback ? socket : rtc;
  return { ...active, error: setupError || active.error, view: view as BrowserLiveView | undefined };
}
