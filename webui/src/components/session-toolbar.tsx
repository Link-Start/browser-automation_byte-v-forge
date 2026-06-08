import { Check, Copy, ExternalLink, Link2, Radio, Square } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../routes/paths';

type SessionToolbarProps = {
  connected: boolean;
  liveViewUrl?: string;
  onStop?: () => void;
  pending?: boolean;
  sessionId: string;
};

export function SessionToolbar({ connected, liveViewUrl, onStop, pending = false, sessionId }: SessionToolbarProps) {
  const [copied, setCopied] = useState(false);

  async function copySessionId() {
    if (!sessionId) return;
    await navigator.clipboard.writeText(sessionId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

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
        <button className="icon-button" disabled={!sessionId} onClick={copySessionId} title="复制会话 ID" type="button" aria-label="复制会话 ID">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        {onStop ? (
          <button className="icon-button icon-button-danger" disabled={pending} onClick={onStop} title="停止会话" type="button" aria-label="停止会话">
            <Square size={16} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
