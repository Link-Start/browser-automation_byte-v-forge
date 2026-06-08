import { AlertTriangle, Check, Copy, ExternalLink, Link2, Radio, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../routes/paths';

type SessionToolbarProps = {
  connected: boolean;
  liveViewUrl?: string;
  onStop?: () => void;
  pending?: boolean;
  sessionId: string;
};

type CopyState = 'failed' | 'idle' | 'success';

export function SessionToolbar({ connected, liveViewUrl, onStop, pending = false, sessionId }: SessionToolbarProps) {
  const copyResetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const stopResetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [stopConfirming, setStopConfirming] = useState(false);

  useEffect(() => () => {
    if (copyResetTimerRef.current) {
      globalThis.clearTimeout(copyResetTimerRef.current);
    }
    if (stopResetTimerRef.current) {
      globalThis.clearTimeout(stopResetTimerRef.current);
    }
  }, []);

  async function copySessionId() {
    if (!sessionId) return;
    clearCopyResetTimer();
    try {
      await writeClipboardText(sessionId);
      setCopyState('success');
    } catch {
      setCopyState('failed');
    }
    copyResetTimerRef.current = globalThis.setTimeout(() => setCopyState('idle'), 1800);
  }

  function requestStopSession() {
    if (!onStop || pending) return;
    if (stopConfirming) {
      clearStopResetTimer();
      setStopConfirming(false);
      onStop();
      return;
    }
    clearCopyResetTimer();
    setCopyState('idle');
    setStopConfirming(true);
    stopResetTimerRef.current = globalThis.setTimeout(() => setStopConfirming(false), 3500);
  }

  function clearCopyResetTimer() {
    if (!copyResetTimerRef.current) return;
    globalThis.clearTimeout(copyResetTimerRef.current);
    copyResetTimerRef.current = undefined;
  }

  function clearStopResetTimer() {
    if (!stopResetTimerRef.current) return;
    globalThis.clearTimeout(stopResetTimerRef.current);
    stopResetTimerRef.current = undefined;
  }

  const feedback = toolbarFeedback(copyState, stopConfirming);
  return (
    <section className="session-toolbar" aria-label="会话快捷操作">
      <div className="session-toolbar-main">
        <span className={connected ? 'live-dot live-dot-on' : 'live-dot'} />
        <div>
          <strong>{sessionId ? '会话已路由化' : '等待启动会话'}</strong>
          <p>{sessionId ? '刷新 / 复制链接后仍会打开同一个 session 控制台。' : '启动后会自动跳转到 /sessions/:sessionId/live。'}</p>
        </div>
      </div>
      <div className="session-toolbar-actions">
        {sessionId ? (
          <Link className="toolbar-link" to={paths.sessionLive(sessionId)} title="打开当前会话 Live 路由">
            <Link2 size={15} />Live 路由
          </Link>
        ) : null}
        {liveViewUrl ? (
          <Link className="toolbar-link toolbar-live" to={liveViewUrl} title="打开独立 LiveView 页面">
            <ExternalLink size={15} />独立 LiveView
          </Link>
        ) : (
          <span className="toolbar-link toolbar-muted"><Radio size={15} />等待 LiveView</span>
        )}
        <button className={copyState === 'failed' ? 'icon-button icon-button-danger' : 'icon-button'} disabled={!sessionId} onClick={copySessionId} title={copyButtonLabel(copyState)} type="button" aria-label={copyButtonLabel(copyState)}>
          {copyIcon(copyState)}
        </button>
        {onStop ? (
          <button className={stopConfirming ? 'icon-button icon-button-danger icon-button-confirm' : 'icon-button icon-button-danger'} disabled={pending} onClick={requestStopSession} title={stopButtonLabel(stopConfirming)} type="button" aria-label={stopButtonLabel(stopConfirming)}>
            {stopConfirming ? <AlertTriangle size={16} /> : <Square size={16} />}
          </button>
        ) : null}
      </div>
      <span className={toolbarFeedbackClass(copyState, stopConfirming)} role="status" aria-live="polite">
        {feedback}
      </span>
    </section>
  );
}

async function writeClipboardText(value: string) {
  if (!navigator.clipboard) {
    throw new Error('clipboard unavailable');
  }
  await navigator.clipboard.writeText(value);
}

function copyButtonLabel(state: CopyState) {
  if (state === 'success') return '会话 ID 已复制';
  if (state === 'failed') return '复制失败，请手动复制会话 ID';
  return '复制会话 ID';
}

function copyFeedback(state: CopyState) {
  if (state === 'success') return '会话 ID 已复制';
  if (state === 'failed') return '复制失败，请手动复制';
  return '';
}

function stopButtonLabel(confirming: boolean) {
  return confirming ? '再次点击停止会话' : '停止会话';
}

function toolbarFeedback(copyState: CopyState, stopConfirming: boolean) {
  if (stopConfirming) return '再次点击停止会话，或等待取消。';
  return copyFeedback(copyState);
}

function toolbarFeedbackClass(copyState: CopyState, stopConfirming: boolean) {
  return copyState === 'failed' || stopConfirming ? 'toolbar-feedback toolbar-feedback-error' : 'toolbar-feedback';
}

function copyIcon(state: CopyState) {
  if (state === 'success') return <Check size={16} />;
  if (state === 'failed') return <AlertTriangle size={16} />;
  return <Copy size={16} />;
}
