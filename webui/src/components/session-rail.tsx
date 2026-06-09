import { Clock3, Code2, MonitorDot, RefreshCcw, Rows3 } from 'lucide-react';
import { Link } from 'react-router';
import { browserKindLabel, sessionStatusLabel, sessionStatusTone } from '../api/defaults';
import type { BrowserSession } from '../proto/browser/automation/v1/browser_automation';
import { BrowserSessionStatus } from '../proto/browser/automation/v1/browser_automation';
import { paths } from '../routes/paths';

type SessionRailProps = {
  activeSessionId?: string;
  lastUpdatedAt?: number;
  onRefresh: () => void;
  refreshing: boolean;
  sessions: BrowserSession[];
};

export function SessionRail({ activeSessionId, lastUpdatedAt, onRefresh, refreshing, sessions }: SessionRailProps) {
  const activeCount = sessions.filter(isActiveSession).length;
  return (
    <aside className="session-rail" aria-label="浏览器会话">
      <div className="session-rail-header">
        <div>
          <p className="section-kicker">Sessions</p>
          <h2>会话</h2>
        </div>
        <button className="icon-button card-icon-button" disabled={refreshing} onClick={onRefresh} title="刷新会话" type="button" aria-label="刷新会话">
          <RefreshCcw className={refreshing ? 'spin' : undefined} size={16} />
        </button>
      </div>
      <p className="session-rail-summary">{activeCount} 活跃 / {sessions.length} 总计</p>
      {lastUpdatedAt ? <p className="session-rail-updated">更新 {formatSessionTime(new Date(lastUpdatedAt).toISOString())}</p> : null}
      <div className="session-rail-list">
        {sessions.length === 0 ? <EmptyRail /> : sessions.map((session) => <SessionRailItem active={session.session_id === activeSessionId} key={session.session_id} session={session} />)}
      </div>
    </aside>
  );
}

function SessionRailItem({ active, session }: { active: boolean; session: BrowserSession }) {
  const sessionId = session.session_id;
  return (
    <article className={active ? 'session-rail-item session-rail-item-active' : 'session-rail-item'}>
      <Link className="session-rail-main" to={paths.sessionLive(sessionId)}>
        <span className={`session-status-dot ${sessionStatusTone(session.status)}`} />
        <span>
          <strong title={sessionId}>{shortID(sessionId)}</strong>
          <small>{session.profile ? browserKindLabel(session.profile.browser_kind) : 'browser'} · {session.profile?.locale || '-'}</small>
        </span>
        <em>{sessionStatusLabel(session.status)}</em>
      </Link>
      <div className="session-rail-meta">
        <span><Clock3 size={13} />{formatSessionTime(session.updated_at || session.created_at)}</span>
        <span>{session.profile?.timezone || '-'}</span>
      </div>
      <div className="session-rail-actions">
        <Link className="mini-link" to={paths.sessionLive(sessionId)}><MonitorDot size={14} />Live</Link>
        <Link className="mini-link" to={paths.sessionCommands(sessionId)}><Code2 size={14} />命令</Link>
        <Link className="mini-link" to={paths.sessionTasks(sessionId)}><Rows3 size={14} />任务</Link>
      </div>
    </article>
  );
}

function EmptyRail() {
  return <p className="session-rail-empty">还没有会话。输入地址并启动后，会话会固定在这里。</p>;
}

function isActiveSession(session: BrowserSession) {
  return session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING || session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING;
}

function shortID(value: string) {
  return value.length > 14 ? `${value.slice(0, 14)}…` : value;
}

function formatSessionTime(value: string | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit' });
}
