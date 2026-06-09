import { Clock3, Code2, MonitorDot, Plus, RefreshCcw, Rows3 } from 'lucide-react';
import { Link } from 'react-router';
import { browserKindLabel, sessionStatusLabel, sessionStatusTone } from '../api/defaults';
import type { BrowserSession } from '../proto/browser/automation/v1/browser_automation';
import { BrowserSessionStatus } from '../proto/browser/automation/v1/browser_automation';
import { paths } from '../routes/paths';
import { EmptyState } from './empty-state';

type SessionListProps = {
  lastUpdatedAt?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  sessions: BrowserSession[];
};

export function SessionList({ lastUpdatedAt, onRefresh, refreshing = false, sessions }: SessionListProps) {
  const activeCount = sessions.filter(isActiveSession).length;
  return (
    <section className="card session-list-card">
      <div className="card-title">
        <div>
          <p className="section-kicker">Sessions</p>
          <h2>可进入的浏览器会话</h2>
        </div>
        <div className="card-title-actions">
          <span>{activeCount} 活跃 / {sessions.length} 总计</span>
          {onRefresh ? (
            <button className="icon-button card-icon-button" disabled={refreshing} onClick={onRefresh} title="刷新会话列表" type="button" aria-label="刷新会话列表">
              <RefreshCcw className={refreshing ? 'spin' : undefined} size={16} />
            </button>
          ) : null}
        </div>
      </div>
      {lastUpdatedAt ? <p className="muted session-list-updated">上次刷新：{formatSessionTime(new Date(lastUpdatedAt).toISOString())}</p> : null}
      {sessions.length === 0 ? <EmptySessions /> : <SessionGrid sessions={sessions} />}
    </section>
  );
}

function SessionGrid({ sessions }: { sessions: BrowserSession[] }) {
  return <div className="session-list-grid">{sessions.map((session) => <SessionItem key={session.session_id} session={session} />)}</div>;
}

function SessionItem({ session }: { session: BrowserSession }) {
  const sessionId = session.session_id;
  return (
    <article className="session-list-item">
      <div className="session-list-item-header">
        <div>
          <strong title={sessionId}>{shortID(sessionId)}</strong>
          <small>{session.profile ? browserKindLabel(session.profile.browser_kind) : 'browser'} · {session.profile?.locale || '-'}</small>
        </div>
        <span className={`status-chip ${sessionStatusTone(session.status)}`}>{sessionStatusLabel(session.status)}</span>
      </div>
      <div className="session-list-meta">
        <span><Clock3 size={13} />更新 {formatSessionTime(session.updated_at || session.created_at)}</span>
        <span>Timezone {session.profile?.timezone || '-'}</span>
        <span>到期 {formatSessionTime(session.expires_at)}</span>
      </div>
      <div className="session-actions">
        <Link className="mini-link" to={paths.sessionLive(sessionId)}><MonitorDot size={14} />进入 Live</Link>
        <Link className="mini-link" to={paths.sessionCommands(sessionId)}><Code2 size={14} />命令</Link>
        <Link className="mini-link" to={paths.sessionTasks(sessionId)}><Rows3 size={14} />任务</Link>
      </div>
    </article>
  );
}

function EmptySessions() {
  return (
    <EmptyState
      action={<Link className="mini-link" to={paths.newSession}><Plus size={14} />新建第一个会话</Link>}
      description="当前没有可展示的浏览器会话。创建后会自动出现在首页，之后可直接点选进入。"
      icon={<MonitorDot size={22} />}
      title="暂无浏览器会话"
    />
  );
}

function isActiveSession(session: BrowserSession) {
  return session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING || session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING;
}

function shortID(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}…` : value;
}

function formatSessionTime(value: string | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit' });
}
