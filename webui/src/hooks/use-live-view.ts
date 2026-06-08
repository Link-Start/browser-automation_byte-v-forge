import { useEffect, useRef, useState } from 'react';
import type { BrowserLiveFrame, BrowserLiveInputEvent, BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';
import { createLiveView, liveViewWebSocketPath } from '../api/browser-api';

type LiveViewState = {
  connected: boolean;
  error?: string;
  frame?: BrowserLiveFrame;
  sendInput: (input: BrowserLiveInputEvent) => void;
  view?: BrowserLiveView;
};

type LiveServerMessage = {
  error?: { message?: string };
  frame?: BrowserLiveFrame;
};

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

function useBrowserLiveSocket(websocketPath: string): LiveViewState {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();
  const [frame, setFrame] = useState<BrowserLiveFrame>();

  useEffect(() => {
    if (!websocketPath) {
      setConnected(false);
      setFrame(undefined);
      setError(undefined);
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }
    let closed = false;
    setConnected(false);
    setError(undefined);
    setFrame(undefined);
    const socket = new WebSocket(resolveWebSocketURL(websocketPath));
    socketRef.current = socket;
    socket.onopen = () => !closed && setConnected(true);
    socket.onclose = () => !closed && setConnected(false);
    socket.onerror = () => !closed && setError('live view websocket failed');
    socket.onmessage = (event) => {
      if (closed) return;
      const message = parseLiveServerMessage(event.data);
      if (message.error?.message) {
        setError(message.error.message);
        return;
      }
      if (message.frame) {
        setFrame(message.frame);
      }
    };
    return () => {
      closed = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [websocketPath]);

  function sendInput(input: BrowserLiveInputEvent) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ input }));
  }

  return { connected, error, frame, sendInput };
}

function parseLiveServerMessage(data: unknown): LiveServerMessage {
  try {
    return JSON.parse(String(data)) as LiveServerMessage;
  } catch {
    return { error: { message: 'live view returned invalid message' } };
  }
}

function resolveWebSocketURL(path: string) {
  if (path.startsWith('ws://') || path.startsWith('wss://')) return path;
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}${path.startsWith('/') ? path : `/${path}`}`;
}
