import { useEffect, useRef, useState } from 'react';
import { createLiveWebRTCAnswer } from '../api/browser-api';
import type { BrowserLiveFrame, BrowserLiveInputEvent, BrowserLiveServerMessage } from '../proto/browser/automation/v1/browser_automation';
import type { LiveViewState } from './live-view-state';

const maxReconnectAttempts = 5;
const reconnectBaseDelayMs = 800;
const reconnectMaxDelayMs = 8_000;
const iceGatherTimeoutMs = 10_000;
const liveDataChannel = 'browser-live';

export function useBrowserLiveRTC(answerPath: string): LiveViewState {
  const channelRef = useRef<RTCDataChannel | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();
  const [frame, setFrame] = useState<BrowserLiveFrame>();
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let closed = false;
    let fatal = false;
    let reconnectScheduled = false;

    function resetState() {
      setConnected(false);
      setFrame(undefined);
      setError(undefined);
      setReconnecting(false);
    }

    if (!answerPath) {
      resetState();
      closePeer();
      clearReconnectTimer();
      return;
    }

    resetState();
    void connect();

    async function connect() {
      reconnectScheduled = false;
      closePeer();
      const peer = new RTCPeerConnection();
      const channel = peer.createDataChannel(liveDataChannel);
      peerRef.current = peer;
      channelRef.current = channel;
      channel.onopen = () => {
        attempts = 0;
        setConnected(true);
        setError(undefined);
        setReconnecting(false);
      };
      channel.onclose = () => scheduleReconnect();
      channel.onerror = () => setReconnecting(true);
      channel.onmessage = (event) => handleMessage(event.data);
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected' || peer.connectionState === 'closed') scheduleReconnect();
      };
      try {
        await negotiate(peer);
      } catch (cause) {
        if (!closed) setError(errorMessage(cause));
        scheduleReconnect();
      }
    }

    async function negotiate(peer: RTCPeerConnection) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitIceGatheringComplete(peer);
      const local = peer.localDescription;
      if (!local?.sdp) throw new Error('WebRTC offer is unavailable');
      const response = await createLiveWebRTCAnswer(answerPath, { live_view_token: '', offer_sdp: local.sdp, offer_type: local.type });
      await peer.setRemoteDescription({ sdp: response.answer_sdp, type: response.answer_type as RTCSdpType });
    }

    function handleMessage(data: unknown) {
      const message = parseLiveServerMessage(data);
      if (message.error?.message) {
        fatal = true;
        setError(message.error.message);
        closePeer();
        return;
      }
      if (message.frame) setFrame(message.frame);
    }

    function scheduleReconnect() {
      if (closed || fatal || reconnectScheduled) return;
      setConnected(false);
      if (attempts >= maxReconnectAttempts) {
        setError('WebRTC 连接已断开，请刷新页面。');
        setReconnecting(false);
        return;
      }
      attempts += 1;
      reconnectScheduled = true;
      setReconnecting(true);
      clearReconnectTimer();
      reconnectTimerRef.current = globalThis.setTimeout(() => void connect(), reconnectDelayMs(attempts));
    }

    function closePeer() {
      channelRef.current?.close();
      channelRef.current = null;
      peerRef.current?.close();
      peerRef.current = null;
    }

    function clearReconnectTimer() {
      if (!reconnectTimerRef.current) return;
      globalThis.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }

    return () => {
      closed = true;
      clearReconnectTimer();
      closePeer();
    };
  }, [answerPath]);

  function sendInput(input: BrowserLiveInputEvent) {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return;
    channel.send(JSON.stringify({ input }));
  }

  return { connected, error, frame, reconnecting, sendInput };
}

function parseLiveServerMessage(data: unknown): BrowserLiveServerMessage {
  try {
    return JSON.parse(String(data)) as BrowserLiveServerMessage;
  } catch {
    return { error: { message: 'WebRTC returned invalid message' } } as BrowserLiveServerMessage;
  }
}

function waitIceGatheringComplete(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      peer.removeEventListener('icegatheringstatechange', onChange);
      reject(new Error('WebRTC ICE gathering timed out'));
    }, iceGatherTimeoutMs);
    function onChange() {
      if (peer.iceGatheringState !== 'complete') return;
      globalThis.clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }
    peer.addEventListener('icegatheringstatechange', onChange);
  });
}

function reconnectDelayMs(attempt: number) {
  return Math.min(reconnectBaseDelayMs * 2 ** Math.max(0, attempt - 1), reconnectMaxDelayMs);
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'WebRTC 连接失败。';
}
