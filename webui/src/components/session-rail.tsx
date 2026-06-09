import { Badge, Button, Card, Flex, IconButton, ScrollArea, Text } from '@radix-ui/themes';
import { Code2, MonitorDot, RefreshCcw, Rows3 } from 'lucide-react';
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
    <aside className="session-rail" aria-label="浏览器窗口">
      <div className="session-rail-header">
        <Text as="p" size="3" weight="bold">Windows</Text>
        <Flex align="center" gap="2">
          <Badge color="gray" variant="soft">{activeCount}/{sessions.length}</Badge>
          <IconButton disabled={refreshing} onClick={onRefresh} title="刷新" type="button" aria-label="刷新" variant="ghost">
            <RefreshCcw className={refreshing ? 'spin' : undefined} size={15} />
          </IconButton>
        </Flex>
      </div>
      <ScrollArea className="session-rail-list" scrollbars="vertical">
        {sessions.length === 0 ? <EmptyRail /> : sessions.map((session) => <SessionRailItem active={session.session_id === activeSessionId} key={session.session_id} session={session} />)}
      </ScrollArea>
      {lastUpdatedAt ? <Text as="p" className="session-rail-updated" color="gray" size="1">{formatSessionTime(new Date(lastUpdatedAt).toISOString())}</Text> : null}
    </aside>
  );
}

function SessionRailItem({ active, session }: { active: boolean; session: BrowserSession }) {
  const sessionId = session.session_id;
  return (
    <Card className={active ? 'session-rail-item session-rail-item-active' : 'session-rail-item'}>
      <Link className="session-rail-main" to={paths.sessionLive(sessionId)}>
        <span className={`session-status-dot ${sessionStatusTone(session.status)}`} />
        <span>
          <strong>{session.profile ? browserKindLabel(session.profile.browser_kind) : 'Browser'}</strong>
          <small title={sessionId}>{shortID(sessionId)} · {session.profile?.locale || '-'}</small>
        </span>
        <Badge color={sessionStatusColor(session.status)} variant="soft">{sessionStatusLabel(session.status)}</Badge>
      </Link>
      <Flex className="session-rail-actions" gap="1" wrap="wrap">
        <Button asChild size="1" variant="ghost"><Link to={paths.sessionLive(sessionId)} title="实时浏览器"><MonitorDot size={14} />Live</Link></Button>
        <Button asChild size="1" variant="ghost"><Link to={paths.sessionCommands(sessionId)} title="高级操作"><Code2 size={14} />高级</Link></Button>
        <Button asChild size="1" variant="ghost"><Link to={paths.sessionTasks(sessionId)} title="历史记录"><Rows3 size={14} />历史</Link></Button>
      </Flex>
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
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

function formatSessionTime(value: string | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function sessionStatusColor(status: BrowserSessionStatus) {
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING) return 'green';
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING || status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STOPPING) return 'amber';
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_FAILED) return 'red';
  return 'gray';
}
