import { Activity, Bot, Loader2 } from 'lucide-react';

type PageHeaderProps = {
  activeSessionId: string;
  error?: string;
  pending: boolean;
};

export function PageHeader({ activeSessionId, error, pending }: PageHeaderProps) {
  return (
    <header className="hero">
      <div className="hero-copy">
        <div className="service-badge">
          <Bot size={16} />
          <span>Browser Automation</span>
        </div>
        <h1>浏览器自动化控制台</h1>
        <p>独立管理会话、执行页面动作，并查看任务结果与产物。</p>
      </div>
      <div className="hero-state">
        <div className={error ? 'state-pill state-error' : 'state-pill'}>
          {pending ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
          <span>{error || (pending ? '请求处理中' : '服务可用')}</span>
        </div>
        <p className="session-chip">当前会话：{activeSessionId || '未启动'}</p>
      </div>
    </header>
  );
}
