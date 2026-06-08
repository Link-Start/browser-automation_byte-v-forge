import type { ReactNode } from 'react';

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
};

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
