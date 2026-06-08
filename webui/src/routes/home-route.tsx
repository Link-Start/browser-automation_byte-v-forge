import { ArrowRight, MonitorDot, Plus, Radio, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '../components/page-header';
import { paths } from './paths';

type HomeAction = {
  cta: string;
  description: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
  to: string;
};

const homeActions: HomeAction[] = [
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

export function HomeRoute() {
  return (
    <main className="home-page">
      <PageHeader
        description="首页只保留入口和路由说明，具体配置、LiveView、命令和任务记录都进入独立页面。"
        pending={false}
        title="浏览器自动化入口"
      />
      <section className="home-grid" aria-label="浏览器自动化入口">
        {homeActions.map((action) => (
          <HomeActionCard key={action.to} action={action} />
        ))}
      </section>
      <section className="card route-map-card">
        <div className="route-card-header">
          <span className="route-card-icon"><MonitorDot size={18} /></span>
          <div>
            <p className="section-kicker">Route split</p>
            <h2>会话内页面不再塞进首页</h2>
            <p>/sessions/:id/live 只看画面，/commands 只执行命令，/tasks 只查任务记录。</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function HomeActionCard({ action }: { action: HomeAction }) {
  const Icon = action.icon;
  return (
    <Link className="card home-card" to={action.to}>
      <div className="route-card-header">
        <span className="route-card-icon"><Icon size={18} /></span>
        <div>
          <p className="section-kicker">{action.kicker}</p>
          <h2>{action.title}</h2>
          <p>{action.description}</p>
        </div>
      </div>
      <span className="home-card-cta">{action.cta}<ArrowRight size={16} /></span>
    </Link>
  );
}
