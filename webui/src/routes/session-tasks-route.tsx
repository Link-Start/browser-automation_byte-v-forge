import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import { listTasks } from '../api/browser-api';
import { PageHeader } from '../components/page-header';
import { Status } from '../components/status';
import { SummaryCard } from '../components/summary-card';
import { TaskList } from '../components/task-list';
import { paths } from './paths';
import { SessionTabs } from './session-tabs';
import { summarizeTasks } from './session-route-utils';

export function SessionTasksRoute() {
  const { sessionId = '' } = useParams();
  const tasks = useQuery({ queryKey: ['tasks', sessionId], queryFn: () => listTasks(sessionId), refetchInterval: 8000 });
  if (!sessionId) return <Navigate replace to={paths.sessions} />;
  const taskItems = tasks.data?.tasks || [];
  return (
    <main>
      <PageHeader activeSessionId={sessionId} error={tasks.error?.message} pending={tasks.isFetching} />
      <SessionTabs sessionId={sessionId} />
      <Status error={tasks.error?.message} message="任务列表独立展示，避免和浏览器画面、命令表单互相挤压。" />
      <SummaryCard {...summarizeTasks(taskItems)} />
      <TaskList tasks={taskItems} />
    </main>
  );
}
