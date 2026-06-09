import type { ReactNode } from 'react';
import { Code2, MonitorDot, Rows3 } from 'lucide-react';
import { NavLink } from 'react-router';
import { paths } from './paths';

type SessionTabsProps = {
  sessionId: string;
};

export function SessionTabs({ sessionId }: SessionTabsProps) {
  return (
    <nav className="session-tabs" aria-label="会话页面">
      <Tab to={paths.sessionLive(sessionId)} label="实时浏览器" icon={<MonitorDot size={15} />} />
      <Tab to={paths.sessionCommands(sessionId)} label="高级操作" icon={<Code2 size={15} />} />
      <Tab to={paths.sessionTasks(sessionId)} label="历史记录" icon={<Rows3 size={15} />} />
    </nav>
  );
}

function Tab({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return <NavLink className={({ isActive }) => (isActive ? 'session-tab session-tab-active' : 'session-tab')} to={to}>{icon}{label}</NavLink>;
}
