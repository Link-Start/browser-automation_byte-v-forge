import { Badge, Box, Card, Flex, IconButton, ScrollArea, Text, Tooltip } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router';
import { browserKindLabel, sessionStatusLabel, sessionStatusTone } from '../api/defaults';
import { BrowserSessionStatus, type BrowserSession } from '../proto/browser/automation/v1/browser_automation';
import { paths } from '../routes/paths';

type SessionRailProps = {
  activeSessionId?: string;
  onRefresh: () => void;
  refreshing: boolean;
  sessions: BrowserSession[];
};

export function SessionRail({ activeSessionId, onRefresh, refreshing, sessions }: SessionRailProps) {
  const visibleSessions = sessions.filter(isVisibleSession);
  return (
    <Card className="session-rail" role="complementary" aria-label="浏览器窗口">
      <Flex align="center" className="session-rail-header" justify="between">
        <Text as="p" size="3" weight="bold">窗口</Text>
        <Flex align="center" gap="1">
          <Badge color="gray" variant="soft">{visibleSessions.length}</Badge>
          <RailLink label="新窗口" to={paths.home}><Plus size={15} /></RailLink>
          <Tooltip content="刷新">
            <IconButton disabled={refreshing} onClick={onRefresh} type="button" aria-label="刷新" variant="ghost">
              <RefreshCcw className={refreshing ? 'spin' : undefined} size={15} />
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
      <ScrollArea className="session-rail-list" scrollbars="vertical">
        <Flex direction="column" gap="2">
          {visibleSessions.length === 0 ? <EmptyRail /> : visibleSessions.map((session) => <SessionRailItem active={session.session_id === activeSessionId} key={session.session_id} session={session} />)}
        </Flex>
      </ScrollArea>
    </Card>
  );
}

function SessionRailItem({ active, session }: { active: boolean; session: BrowserSession }) {
  const sessionId = session.session_id;
  return (
    <Card className={active ? 'session-rail-item session-rail-item-active' : 'session-rail-item'}>
      <Link className="session-rail-main" to={paths.session(sessionId)}>
        <Flex align="center" className="session-rail-meta" gap="2">
          <span className={`session-status-dot ${sessionStatusTone(session.status)}`} />
          <Box className="session-rail-title">
            <Text as="span" size="2" weight="bold">{session.profile ? browserKindLabel(session.profile.browser_kind) : 'Browser'}</Text>
            <Text as="span" className="session-rail-subtitle" color="gray" size="1" title={sessionId}>{session.profile?.locale || session.profile?.timezone || shortID(sessionId)}</Text>
          </Box>
        </Flex>
        <Badge color={sessionStatusColor(session.status)} variant="soft">{sessionStatusLabel(session.status)}</Badge>
      </Link>
    </Card>
  );
}

function RailLink({ children, label, to }: { children: ReactNode; label: string; to: string }) {
  return <Tooltip content={label}><IconButton asChild aria-label={label} variant="ghost"><Link to={to}>{children}</Link></IconButton></Tooltip>;
}

function EmptyRail() {
  return <Card className="session-rail-empty"><Text as="p" color="gray">无窗口</Text></Card>;
}

function isVisibleSession(session: BrowserSession) {
  return session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING ||
    session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING ||
    session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STOPPING;
}

function shortID(value: string) {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

function sessionStatusColor(status: BrowserSessionStatus) {
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING) return 'green';
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING || status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STOPPING) return 'amber';
  if (status === BrowserSessionStatus.BROWSER_SESSION_STATUS_FAILED) return 'red';
  return 'gray';
}
