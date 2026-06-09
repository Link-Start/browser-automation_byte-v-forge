import { Badge, Button, Card, Flex, IconButton, ScrollArea, Text } from '@radix-ui/themes';
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
          <Text as="p" size="5" weight="bold">会话</Text>
        </div>
        <IconButton disabled={refreshing} onClick={onRefresh} title="刷新会话" type="button" aria-label="刷新会话" variant="soft">
          <RefreshCcw className={refreshing ? 'spin' : undefined} size={16} />
        </IconButton>
      </div>
      <Flex align="center" className="session-rail-summary" gap="2">
        <Badge color="green" variant="soft">{activeCount} 活跃</Badge>
        <Badge color="orange" variant="soft">{sessions.length} 总计</Badge>
      </Flex>
      {lastUpdatedAt ? <Text as="p" className="session-rail-updated" color="gray" size="1">更新 {formatSessionTime(new Date(lastUpdatedAt).toISOString())}</Text> : null}
      <ScrollArea className="session-rail-list" scrollbars="vertical">
        {sessions.length === 0 ? <EmptyRail /> : sessions.map((session) => <SessionRailItem active={session.session_id === activeSessionId} key={session.session_id} session={session} />)}
      </ScrollArea>
    </aside>
  );
}

function SessionRailItem({ active, session }: { active: boolean; session: BrowserSession }) {
  const sessionId = session.session_id;
  return (
    <Card className={active ? 'session-rail-item session-rail-item-active' : 'session-rail-item'}>
      <article>
      <Link className="session-rail-main" to={paths.sessionLive(sessionId)}>
        <span className={`session-status-dot ${sessionStatusTone(session.status)}`} />
        <span>
          <strong title={sessionId}>{shortID(sessionId)}</strong>
          <small>{session.profile ? browserKindLabel(session.profile.browser_kind) : 'browser'} · {session.profile?.locale || '-'}</small>
        </span>
        <Badge color={sessionStatusColor(session.status)} variant="soft">{sessionStatusLabel(session.status)}</Badge>
      </Link>
      <div className="session-rail-meta">
        <span><Clock3 size={13} />{formatSessionTime(session.updated_at || session.created_at)}</span>
        <span>{session.profile?.timezone || '-'}</span>
      </div>
      <Flex className="session-rail-actions" gap="1" wrap="wrap">
        <Button asChild size="1" variant="soft"><Link to={paths.sessionLive(sessionId)}><MonitorDot size={14} />Live</Link></Button>
        <Button asChild size="1" variant="soft"><Link to={paths.sessionCommands(sessionId)}><Code2 size={14} />高级</Link></Button>
        <Button asChild size="1" variant="soft"><Link to={paths.sessionTasks(sessionId)}><Rows3 size={14} />历史</Link></Button>
      </Flex>
      </article>
    </Card>
  );
}

function EmptyRail() {
  return <Card className="session-rail-empty"><Text as="p" color="gray">暂无会话</Text></Card>;
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

function sessionStatusColor(status: BrowserSessionStatus) {
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING) return 'green';
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING || status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STOPPING) return 'amber';
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_FAILED) return 'red';
  return 'gray';
}
