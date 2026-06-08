import { Home, Plus, Radio } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { paths } from './paths';

export function AppShell() {
  return (
    <div className="app-shell">
      <nav className="route-nav" aria-label="Browser Automation routes">
        <NavLink end to={paths.home} className={({ isActive }) => (isActive ? 'route-link route-link-active' : 'route-link')}>
          <Home size={15} />入口
        </NavLink>
        <NavLink to={paths.newSession} className={({ isActive }) => (isActive ? 'route-link route-link-active' : 'route-link')}>
          <Plus size={15} />新建会话
        </NavLink>
        <NavLink to={paths.openSession} className={({ isActive }) => (isActive ? 'route-link route-link-active' : 'route-link')}>
          <Radio size={15} />接管会话
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
