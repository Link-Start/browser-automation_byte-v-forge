import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import { useQuery } from '@tanstack/react-query';
import { Cloud, Home, Plus, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { listSessions } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { BrowserSessionStatus, type BrowserSession } from '../proto/browser/automation/v1/browser_automation';
import { paths } from './paths';

const routeLinks: Array<{ icon: LucideIcon; label: string; to: string; end?: boolean }> = [
  { end: true, icon: Home, label: '浏览器', to: paths.home },
  { icon: Plus, label: '配置', to: paths.newSession }
];

export function AppShell() {
  const sessions = useQuery({ queryKey: browserQueryKeys.sessions, queryFn: listSessions, refetchInterval: 10_000 });
  const sessionItems = sessions.data?.sessions || [];
  const activeCount = sessionItems.filter(isActiveSession).length;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到页面内容</a>
      <header className="app-topbar">
        <Flex align="center" className="app-topbar-inner" gap="4" justify="between">
          <Flex align="center" className="app-brand" gap="2">
            <span className="app-brand-mark"><Cloud size={17} /></span>
            <Text as="p" size="3" weight="bold">Cloud Browser</Text>
          </Flex>
          <nav className="route-nav" aria-label="Cloud Browser routes">
            {routeLinks.map((link) => <RouteLink key={link.to} {...link} />)}
          </nav>
          <Flex align="center" className="app-topbar-actions" gap="2">
            <Badge color="gray" variant="soft">{activeCount}/{sessionItems.length}</Badge>
            <Button asChild size="2"><NavLink to={paths.newSession}><Plus size={15} />新建</NavLink></Button>
          </Flex>
        </Flex>
      </header>
      <Outlet />
    </div>
  );
}

function RouteLink({ end, icon: Icon, label, to }: { end?: boolean; icon: LucideIcon; label: string; to: string }) {
  return (
    <NavLink end={end} to={to} className={({ isActive }) => (isActive ? 'route-link route-link-active' : 'route-link')}>
      <Icon size={15} />{label}
    </NavLink>
  );
}

function isActiveSession(session: BrowserSession) {
  return session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING || session.status === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING;
}
