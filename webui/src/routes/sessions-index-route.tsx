import { Plus, Radio } from 'lucide-react';
import { PageFrame } from '../components/page-frame';
import { PageHeader } from '../components/page-header';
import { RouteOptionGrid, type RouteOption } from '../components/route-option-card';
import { paths } from './paths';

const sessionOptions: RouteOption[] = [
  {
    cta: '进入配置',
    description: '只填写浏览器、Locale、Timezone 和代理引用，启动后自动跳转实时浏览器。',
    icon: Plus,
    kicker: 'Start',
    title: '新建浏览器会话',
    to: paths.newSession
  },
  {
    cta: '输入 Session ID',
    description: '接管已经创建的 session，再按路由进入实时画面、命令执行或任务记录。',
    icon: Radio,
    kicker: 'Resume',
    title: '接管已有会话',
    to: paths.openSession
  }
];

export function SessionsIndexRoute() {
  return (
    <PageFrame className="session-entry-page">
      <PageHeader
        description="这里只做会话入口选择；启动配置、已有会话接管和会话内控制台分别由独立路由承载。"
        pending={false}
        title="会话入口"
      />
      <RouteOptionGrid ariaLabel="会话入口" options={sessionOptions} />
    </PageFrame>
  );
}
