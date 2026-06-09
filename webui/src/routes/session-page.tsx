import type { ReactNode } from 'react';
import { PageFrame } from '../components/page-frame';
import { PageHeader } from '../components/page-header';
import { Status } from '../components/status';
import { SessionTabs } from './session-tabs';

type SessionPageProps = {
  children: ReactNode;
  description?: string;
  error?: string;
  pending: boolean;
  sessionId: string;
  statusMessage?: string;
  title: string;
};

export function SessionPage({ children, description, error, pending, sessionId, statusMessage, title }: SessionPageProps) {
  return (
    <PageFrame>
      <PageHeader activeSessionId={sessionId} description={description} error={error} pending={pending} title={title} />
      <SessionTabs sessionId={sessionId} />
      <Status error={error} message={statusMessage} />
      {children}
    </PageFrame>
  );
}
