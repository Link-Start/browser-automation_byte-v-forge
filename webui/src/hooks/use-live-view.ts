import { useEffect, useState } from 'react';
import { createLiveView, liveViewWebSocketPath } from '../api/browser-api';
import type { BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';
import { type LiveViewState, useBrowserLiveSocket } from './use-browser-live-socket';

export function useLiveView(sessionId: string): LiveViewState {
  const [view, setView] = useState<BrowserLiveView>();
  const [socketPath, setSocketPath] = useState('');
  const [createError, setCreateError] = useState<string>();
  const socket = useBrowserLiveSocket(socketPath);

  useEffect(() => {
    if (!sessionId) {
      setCreateError(undefined);
      setSocketPath('');
      setView(undefined);
      return;
    }
    let closed = false;
    setCreateError(undefined);
    setSocketPath('');
    createLiveView(sessionId)
      .then((response) => {
        if (closed) return;
        const liveView = response.live_view;
        if (!liveView?.websocket_url) {
          throw new Error(response.error?.message || 'live view is unavailable');
        }
        setView(liveView);
        setSocketPath(liveView.websocket_url);
      })
      .catch((cause: unknown) => {
        if (!closed) setCreateError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      closed = true;
    };
  }, [sessionId]);

  return { ...socket, error: createError || socket.error, view };
}

export function useLiveViewToken(token: string): LiveViewState {
  return useBrowserLiveSocket(token ? liveViewWebSocketPath(token) : '');
}
