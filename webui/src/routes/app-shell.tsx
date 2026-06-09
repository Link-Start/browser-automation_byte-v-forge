import { Flex, IconButton, Text, Tooltip } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { BrandLogo } from '../components/brand-logo';
import { paths } from './paths';

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到页面内容</a>
      <header className="app-topbar">
        <Flex align="center" className="app-topbar-inner" justify="between">
          <Link className="app-brand" to={paths.home} aria-label="Cloud Browser">
            <BrandLogo />
            <Text as="span" size="3" weight="bold">Cloud Browser</Text>
          </Link>
          <Tooltip content="新窗口">
            <IconButton asChild aria-label="新窗口" size="2" variant="soft">
              <Link to={paths.home}><Plus size={15} /></Link>
            </IconButton>
          </Tooltip>
        </Flex>
      </header>
      <Outlet />
    </div>
  );
}
