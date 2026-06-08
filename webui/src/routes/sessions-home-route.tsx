import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Code2, MonitorDot, Play, Rows3 } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { Status } from '../components/status';
import { paths } from './paths';

export function SessionsHomeRoute() {
  return (
    <main>
      <PageHeader activeSessionId="" pending={false} />
      <Status message="选择一个入口开始：新建会话后，实时浏览器、命令执行、任务记录会进入各自独立路由。" />
      <section className="route-cards" aria-label="Browser automation routes">
        <RouteCard icon={<Play size={22} />} title="新建会话" text="配置浏览器内核、代理、Locale 和时区；启动后跳转到实时浏览器页。" to={paths.newSession} />
        <RouteCard icon={<MonitorDot size={22} />} title="实时浏览器" text="专注展示 CDP LiveView 画面和输入回放，不再混入命令表单。" />
        <RouteCard icon={<Code2 size={22} />} title="执行命令" text="为当前 session 生成并执行 Proto JSON 命令，结果独立展示。" />
        <RouteCard icon={<Rows3 size={22} />} title="任务记录" text="按 session 查看任务列表、状态统计和最近执行结果。" />
      </section>
    </main>
  );
}

type RouteCardProps = {
  icon: ReactNode;
  text: string;
  title: string;
  to?: string;
};

function RouteCard({ icon, text, title, to }: RouteCardProps) {
  const body = <><span>{icon}</span><strong>{title}</strong><p>{text}</p></>;
  return to ? <Link className="route-card route-card-primary" to={to}>{body}</Link> : <div className="route-card">{body}</div>;
}
