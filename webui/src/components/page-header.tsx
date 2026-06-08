import { Activity, Bot, Loader2 } from 'lucide-react';

type PageHeaderProps = {
  activeSessionId?: string;
  description: string;
  error?: string;
  pending: boolean;
  title: string;
};

export function PageHeader({ activeSessionId, description, error, pending, title }: PageHeaderProps) {
  return (
    <header className="hero">
      <div className="hero-copy">
        <div className="service-badge">
          <Bot size={16} />
          <span>Browser Automation</span>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="hero-state">
        <div className={error ? 'state-pill state-error' : 'state-pill'}>
          {pending ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
          <span>{error || (pending ? '请求处理中' : '服务可用')}</span>
        </div>
        {activeSessionId ? <p className="session-chip">当前会话：{activeSessionId}</p> : null}
      </div>
    </header>
  );
}
