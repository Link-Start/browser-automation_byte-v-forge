import { useEffect, useRef, useState } from 'react';
import type { BrowserLiveFrame, BrowserLiveInputEvent, BrowserLiveServerMessage } from '../proto/browser/automation/v1/browser_automation';
import type { LiveViewState } from './live-view-state';

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
    let attempts = 0;
    let closed = false;
    let fatal = false;

    if (!websocketPath) {
      resetState();
      closeSocket();
      clearReconnectTimer();
      return;
    }

    resetState();
    openSocket();

    function openSocket() {
      closeSocket();
      const socket = new WebSocket(resolveWebSocketURL(websocketPath));
      socketRef.current = socket;
      socket.onopen = () => {
        attempts = 0;
        setConnected(true);
        setError(undefined);
        setReconnecting(false);
      };
      socket.onclose = () => {
        if (!closed && !fatal) scheduleReconnect();
      };
      socket.onerror = () => !closed && setReconnecting(true);
      socket.onmessage = (event) => handleMessage(socket, event.data);
    }

    function handleMessage(socket: WebSocket, data: unknown) {
      const message = parseLiveServerMessage(data);
      if (message.error?.message) {
        fatal = true;
        setConnected(false);
        setError(message.error.message);
        setReconnecting(false);
        socket.close();
        return;
      }
      if (message.frame) setFrame(message.frame);
    }

    function scheduleReconnect() {
      if (attempts >= maxReconnectAttempts) {
        setConnected(false);
        setError('实时画面连接失败。');
        setReconnecting(false);
        return;
      }
      attempts += 1;
      setConnected(false);
      setReconnecting(true);
      clearReconnectTimer();
      reconnectTimerRef.current = globalThis.setTimeout(openSocket, reconnectDelayMs(attempts));
    }

    function closeSocket() {
      const socket = socketRef.current;
      if (!socket) return;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.onopen = null;
      socket.close();
      socketRef.current = null;
    }

    function clearReconnectTimer() {
      if (!reconnectTimerRef.current) return;
      globalThis.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }

    function resetState() {
      setConnected(false);
      setFrame(undefined);
      setError(undefined);
      setReconnecting(false);
    }

    return () => {
      closed = true;
      clearReconnectTimer();
      closeSocket();
    };
  }, [websocketPath]);

  function sendInput(input: BrowserLiveInputEvent) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ input }));
  }

  return { connected, error, frame, reconnecting, sendInput, transport: 'websocket' };
}

function parseLiveServerMessage(data: unknown): BrowserLiveServerMessage {
  try {
    return JSON.parse(String(data)) as BrowserLiveServerMessage;
  } catch {
    return { error: { message: '实时画面数据异常。' } } as BrowserLiveServerMessage;
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
