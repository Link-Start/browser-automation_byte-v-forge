import { useQuery } from '@tanstack/react-query';
import { Plus, Radio } from 'lucide-react';
import { Link } from 'react-router';
import { listSessions } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { PageFrame } from '../components/page-frame';
import { PageHeader } from '../components/page-header';
import { SessionList } from '../components/session-list';
import { Status } from '../components/status';
import { paths } from './paths';

export function HomeRoute() {
  const sessions = useQuery({ queryKey: browserQueryKeys.sessions, queryFn: listSessions, refetchInterval: 5000 });
  const sessionItems = sessions.data?.sessions || [];
  return (
    <PageFrame className="home-page session-workbench-page">
      <PageHeader
        description="首页就是工作台：直接查看已有浏览器会话，一键进入 Live、命令或任务记录。"
        error={sessions.error?.message}
        pending={sessions.isPending}
        title="浏览器会话工作台"
      />
      <div className="workbench-actions" aria-label="常用操作">
        <Link className="link-button primary" to={paths.newSession}><Plus size={16} />新建会话</Link>
        <Link className="link-button secondary" to={paths.openSession}><Radio size={16} />接管未列出的会话</Link>
      </div>
      <Status error={sessions.error?.message} message="已有会话会自动出现在下方列表，用户无需记忆或手动输入 session ID。" />
      <SessionList
        lastUpdatedAt={sessions.dataUpdatedAt}
        onRefresh={() => {
          void sessions.refetch();
        }}
        refreshing={sessions.isFetching}
        sessions={sessionItems}
      />
    </PageFrame>
  );
}
