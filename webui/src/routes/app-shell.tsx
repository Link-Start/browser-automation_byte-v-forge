import { Bot, Plus, Radio } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { paths } from './paths';

export function AppShell() {
  return (
    <div className="app-shell">
      <nav className="route-nav" aria-label="Browser Automation routes">
        <NavLink to={paths.sessions} className={({ isActive }) => (isActive ? 'route-link route-link-active' : 'route-link')} end>
          <Bot size={15} />会话入口
        </NavLink>
        <NavLink to={paths.newSession} className={({ isActive }) => (isActive ? 'route-link route-link-active' : 'route-link')}>
          <Plus size={15} />新建会话
        </NavLink>
        <span className="route-link route-link-disabled" aria-disabled="true">
          <Radio size={15} />LiveView: /live/:token
        </span>
      </nav>
      <Outlet />
    </div>
  );
}
