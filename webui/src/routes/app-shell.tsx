import { Home, Plus, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { paths } from './paths';

const routeLinks: Array<{ icon: LucideIcon; label: string; to: string; end?: boolean }> = [
  { end: true, icon: Home, label: '工作台', to: paths.home },
  { icon: Plus, label: '新建会话', to: paths.newSession }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到页面内容</a>
      <nav className="route-nav" aria-label="Browser Automation routes">
        {routeLinks.map((link) => <RouteLink key={link.to} {...link} />)}
      </nav>
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
