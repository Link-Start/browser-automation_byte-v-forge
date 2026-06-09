import { Button, Card, Flex, IconButton, Table, Text, Tooltip } from '@radix-ui/themes';
import { ClipboardList, Code2, MonitorDot, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router';
import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';
import { statusLabel, statusTone } from '../api/defaults';
import { safeMessage, safeURL } from '../api/safe-json';
import { paths } from '../routes/paths';
import { EmptyState } from './empty-state';

type TaskListProps = {
  lastUpdatedAt?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  sessionId: string;
  tasks: BrowserTask[];
};

export function TaskList({ lastUpdatedAt, onRefresh, refreshing = false, sessionId, tasks }: TaskListProps) {
  return (
    <Card className="card task-card">
      <Flex align="center" className="card-title" justify="between">
        <div>
          <Text as="p" size="5" weight="bold">记录</Text>
          {lastUpdatedAt ? <Text as="p" color="gray" size="2">{formatTaskTime(new Date(lastUpdatedAt).toISOString())}</Text> : null}
        </div>
        <Flex align="center" gap="2">
          <Text as="span" color="gray" size="2">{tasks.length}</Text>
          {onRefresh ? (
            <Tooltip content="刷新">
              <IconButton disabled={refreshing} onClick={onRefresh} type="button" aria-label="刷新" variant="ghost">
                <RefreshCcw className={refreshing ? 'spin' : undefined} size={16} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Flex>
      </Flex>
      {tasks.length === 0 ? <EmptyTasks sessionId={sessionId} /> : <TaskTable sessionId={sessionId} tasks={tasks} />}
    </Card>
  );
}

function TaskTable({ sessionId, tasks }: { sessionId: string; tasks: BrowserTask[] }) {
  return (
    <Table.Root className="task-table" variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>任务</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>状态</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>更新时间</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>页面</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>操作</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {tasks.map((task) => (
          <Table.Row key={task.task_id}>
            <Table.Cell>
              <span className="task-id" title={task.task_id}>
                <strong>{task.input?.task_key || task.task_id}</strong>
                <small>{shortID(task.task_id)}</small>
              </span>
            </Table.Cell>
            <Table.Cell><span className={`status-chip ${statusTone(task.status)}`}>{statusLabel(task.status)}</span></Table.Cell>
            <Table.Cell>{formatTaskTime(task.completed_at || task.updated_at || task.started_at || task.created_at)}</Table.Cell>
            <Table.Cell>
              <span className="task-page" title={taskDisplayURL(task)}>
                <strong>{taskTitle(task)}</strong>
                <small>{taskMeta(task)}</small>
                {task.last_error?.message ? <em>{safeMessage(task.last_error.message)}</em> : null}
              </span>
            </Table.Cell>
            <Table.Cell><TaskActions sessionId={sessionId} /></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function TaskActions({ sessionId }: { sessionId: string }) {
  return (
    <Flex className="task-actions" gap="1">
      <Tooltip content="浏览器">
        <IconButton asChild aria-label="浏览器" size="2" variant="soft"><Link to={paths.sessionLive(sessionId)}><MonitorDot size={14} /></Link></IconButton>
      </Tooltip>
      <Tooltip content="工具">
        <IconButton asChild aria-label="工具" size="2" variant="soft"><Link to={paths.sessionCommands(sessionId)}><Code2 size={14} /></Link></IconButton>
      </Tooltip>
    </Flex>
  );
}

function EmptyTasks({ sessionId }: { sessionId: string }) {
  return <EmptyState action={<Button asChild size="2" variant="soft"><Link to={paths.sessionCommands(sessionId)}><Code2 size={14} />工具</Link></Button>} description="无记录" icon={<ClipboardList size={22} />} title="记录为空" />;
}

function taskTitle(task: BrowserTask) {
  const title = task.results?.[0]?.title;
  if (title) return safeMessage(title);
  return taskDisplayURL(task) || '-';
}

function taskDisplayURL(task: BrowserTask) {
  const url = task.input?.target_url || task.results?.[0]?.current_url || '';
  return url ? safeURL(url) : '';
}

function taskMeta(task: BrowserTask) {
  const resultCount = task.results?.length || 0;
  const artifactCount = task.artifacts?.length || 0;
  return `${resultCount} 结果 · ${artifactCount} 产物`;
}

function shortID(value: string) {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

function formatTaskTime(value: string | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit' });
}
