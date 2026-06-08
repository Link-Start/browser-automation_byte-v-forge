import { useEffect, useRef, useState } from 'react';
import type { BrowserLiveFrame, BrowserLiveInputEvent, BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';

export type LiveViewState = {
  connected: boolean;
  error?: string;
  frame?: BrowserLiveFrame;
  reconnecting: boolean;
  sendInput: (input: BrowserLiveInputEvent) => void;
  view?: BrowserLiveView;
};

type LiveServerMessage = {
  error?: { message?: string };
  frame?: BrowserLiveFrame;
};

const maxReconnectAttempts = 5;
const reconnectBaseDelayMs = 800;
const reconnectMaxDelayMs = 8_000;

export function useBrowserLiveSocket(websocketPath: string): LiveViewState {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();
  const [frame, setFrame] = useState<BrowserLiveFrame>();
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let closed = false;
    let fatal = false;
    let attempts = 0;

    function clearReconnectTimer() {
      if (reconnectTimerRef.current) {
        globalThis.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
    }

    function resetState() {
      setConnected(false);
      setFrame(undefined);
      setError(undefined);
      setReconnecting(false);
    }

    if (!websocketPath) {
      resetState();
      socketRef.current?.close();
      socketRef.current = null;
      clearReconnectTimer();
      return;
    }

    resetState();
    openSocket();

    function openSocket() {
      const socket = new WebSocket(resolveWebSocketURL(websocketPath));
      socketRef.current = socket;
      socket.onopen = () => {
        if (closed) return;
        attempts = 0;
        setConnected(true);
        setError(undefined);
        setReconnecting(false);
      };
      socket.onclose = () => {
        if (closed) return;
        setConnected(false);
        if (!fatal) scheduleReconnect();
      };
      socket.onerror = () => !closed && setReconnecting(true);
      socket.onmessage = (event) => handleMessage(socket, event.data);
    }

    function handleMessage(socket: WebSocket, data: unknown) {
      if (closed) return;
      const message = parseLiveServerMessage(data);
      if (message.error?.message) {
        fatal = true;
        setError(message.error.message);
        setReconnecting(false);
        socket.close();
        return;
      }
      if (message.frame) {
        setFrame(message.frame);
      }
    }

    function scheduleReconnect() {
      if (attempts >= maxReconnectAttempts) {
        setError('LiveView 连接已断开，请刷新页面或重新创建 LiveView。');
        setReconnecting(false);
        return;
      }
      attempts += 1;
      setReconnecting(true);
      clearReconnectTimer();
      reconnectTimerRef.current = globalThis.setTimeout(openSocket, reconnectDelayMs(attempts));
    }

    return () => {
      closed = true;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [websocketPath]);

  function sendInput(input: BrowserLiveInputEvent) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ input }));
  }

  return { connected, error, frame, reconnecting, sendInput };
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

function reconnectDelayMs(attempt: number) {
  return Math.min(reconnectBaseDelayMs * 2 ** Math.max(0, attempt - 1), reconnectMaxDelayMs);
}
