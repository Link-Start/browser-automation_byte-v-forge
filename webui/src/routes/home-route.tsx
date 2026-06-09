import { ArrowRight, MonitorDot } from 'lucide-react';
import { Link } from 'react-router';
import { PageFrame } from '../components/page-frame';
import { PageHeader } from '../components/page-header';
import { paths } from './paths';

export function HomeRoute() {
  return (
    <PageFrame className="home-page home-entry">
      <PageHeader
        description="首页只保留控制台入口；会话创建、接管、LiveView、命令和任务记录都进入独立路由。"
        pending={false}
        title="云端浏览器控制台"
      />
      <section className="card home-hero-card" aria-label="浏览器自动化入口">
        <div className="route-card-header">
          <span className="route-card-icon"><MonitorDot size={18} /></span>
          <div>
            <p className="section-kicker">Console entry</p>
            <h2>进入会话入口后再选择操作</h2>
            <p>首页不承载业务表单，避免 Live 画面、命令执行和任务记录再次堆叠在同一页。</p>
          </div>
        </div>
        <div className="home-hero-actions">
          <Link className="link-button primary" to={paths.sessions}>进入会话入口<ArrowRight size={16} /></Link>
        </div>
      </section>
    </PageFrame>
  );
}
