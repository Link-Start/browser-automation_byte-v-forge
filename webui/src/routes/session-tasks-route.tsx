import { useQuery } from '@tanstack/react-query';
import { listTasks } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { SummaryCard } from '../components/summary-card';
import { TaskList } from '../components/task-list';
import { SessionPage } from './session-page';
import { useSessionRoute } from './session-route-layout';
import { summarizeTasks } from './session-route-utils';

export function SessionTasksRoute() {
  const { sessionId } = useSessionRoute();
  const tasks = useQuery({ queryKey: browserQueryKeys.tasks(sessionId), queryFn: () => listTasks(sessionId), refetchInterval: 8000 });
  const taskItems = tasks.data?.tasks || [];
  return (
    <SessionPage
      error={tasks.error?.message}
      pending={tasks.isFetching}
      sessionId={sessionId}
      title="记录"
    >
      <SummaryCard {...summarizeTasks(taskItems)} />
      <TaskList
        lastUpdatedAt={tasks.dataUpdatedAt}
        onRefresh={() => {
          void tasks.refetch();
        }}
        refreshing={tasks.isFetching}
        sessionId={sessionId}
        tasks={taskItems}
      />
    </SessionPage>
  );
}
