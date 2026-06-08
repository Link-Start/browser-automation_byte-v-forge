import { useEffect, useRef, useState } from 'react';
import type { BrowserLiveFrame, BrowserLiveInputEvent, BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';
import { createLiveView } from '../api/browser-api';

type LiveViewState = {
  connected: boolean;
  error?: string;
  frame?: BrowserLiveFrame;
  sendInput: (input: BrowserLiveInputEvent) => void;
  view?: BrowserLiveView;
};

export function useLiveView(sessionId: string): LiveViewState {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();
  const [frame, setFrame] = useState<BrowserLiveFrame>();
  const [view, setView] = useState<BrowserLiveView>();

  useEffect(() => {
    if (!sessionId) {
      setConnected(false);
      setFrame(undefined);
      setView(undefined);
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }
    let closed = false;
    setError(undefined);
    createLiveView(sessionId)
      .then((response) => {
        if (closed) return;
        const liveView = response.live_view;
        if (!liveView?.websocket_url) {
          throw new Error(response.error?.message || 'live view is unavailable');
        }
        setView(liveView);
        const socket = new WebSocket(resolveWebSocketURL(liveView.websocket_url));
        socketRef.current = socket;
        socket.onopen = () => !closed && setConnected(true);
        socket.onclose = () => !closed && setConnected(false);
        socket.onerror = () => !closed && setError('live view websocket failed');
        socket.onmessage = (event) => {
          if (closed) return;
          const message = JSON.parse(String(event.data));
          if (message.error?.message) {
            setError(message.error.message);
            return;
          }
          if (message.frame) {
            setFrame(message.frame);
          }
        };
      })
      .catch((cause: unknown) => {
        if (!closed) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      closed = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [sessionId]);

  function sendInput(input: BrowserLiveInputEvent) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ input }));
  }

  return { connected, error, frame, sendInput, view };
}

function resolveWebSocketURL(path: string) {
  if (path.startsWith('ws://') || path.startsWith('wss://')) return path;
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}${path.startsWith('/') ? path : `/${path}`}`;
}
