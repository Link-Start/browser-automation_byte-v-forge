import { Bot, Radio } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { paths } from './paths';

export function AppShell() {
  return (
    <div className="app-shell">
      <nav className="route-nav" aria-label="Browser Automation routes">
        <NavLink to={paths.sessions} className={({ isActive }) => (isActive ? 'route-link route-link-active' : 'route-link')}>
          <Bot size={15} />控制台
        </NavLink>
        <span className="route-link route-link-disabled" aria-disabled="true">
          <Radio size={15} />LiveView 通过 /live/:token 打开
        </span>
      </nav>
      <Outlet />
    </div>
  );
}
