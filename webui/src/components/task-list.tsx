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
    <section className="card task-card">
      <div className="card-title">
        <div>
          <p className="section-kicker">History</p>
          <h2>历史记录</h2>
        </div>
        <div className="card-title-actions">
          <span>{tasks.length} 条</span>
          {onRefresh ? (
            <button className="icon-button card-icon-button" disabled={refreshing} onClick={onRefresh} title="刷新任务记录" type="button" aria-label="刷新任务记录">
              <RefreshCcw className={refreshing ? 'spin' : undefined} size={16} />
            </button>
          ) : null}
        </div>
      </div>
      {lastUpdatedAt ? <p className="muted task-updated">上次刷新：{formatTaskTime(new Date(lastUpdatedAt).toISOString())}</p> : null}
      {tasks.length === 0 ? <EmptyTasks sessionId={sessionId} /> : <TaskTable sessionId={sessionId} tasks={tasks} />}
    </section>
  );
}

function TaskTable({ sessionId, tasks }: { sessionId: string; tasks: BrowserTask[] }) {
  return (
    <div className="table">
      <div className="table-row task-row table-head">
        <span>任务</span>
        <span>状态</span>
        <span>最近更新</span>
        <span>页面</span>
        <span>操作</span>
      </div>
      {tasks.map((task) => (
        <div className="table-row task-row" key={task.task_id}>
          <span title={task.task_id}>
            <strong>{task.input?.task_key || task.task_id}</strong>
            <small>{shortID(task.task_id)}</small>
          </span>
          <span className={`status-chip ${statusTone(task.status)}`}>{statusLabel(task.status)}</span>
          <span>{formatTaskTime(task.completed_at || task.updated_at || task.started_at || task.created_at)}</span>
          <span title={taskDisplayURL(task)}>
            {taskTitle(task)}
            <small>{taskMeta(task)}</small>
            {task.last_error?.message ? <em>{safeMessage(task.last_error.message)}</em> : null}
          </span>
          <span className="task-actions">
            <Link className="mini-link" to={paths.sessionLive(sessionId)} title="打开实时浏览器"><MonitorDot size={14} />Live</Link>
            <Link className="mini-link" to={paths.sessionCommands(sessionId)} title="继续执行命令"><Code2 size={14} />命令</Link>
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyTasks({ sessionId }: { sessionId: string }) {
  return (
    <EmptyState
      action={<Link className="mini-link" to={paths.sessionCommands(sessionId)}><Code2 size={14} />执行快捷命令</Link>}
      description="暂无记录"
      icon={<ClipboardList size={22} />}
      title="还没有任务记录"
    />
  );
}

function taskTitle(task: BrowserTask) {
  const title = task.results?.[0]?.title;
  if (title) {
    return safeMessage(title);
  }
  return taskDisplayURL(task) || '-';
}

function taskDisplayURL(task: BrowserTask) {
  const url = task.input?.target_url || task.results?.[0]?.current_url || '';
  return url ? safeURL(url) : '';
}

function taskMeta(task: BrowserTask) {
  const resultCount = task.results?.length || 0;
  const artifactCount = task.artifacts?.length || 0;
  return `${resultCount} 个结果 · ${artifactCount} 个产物`;
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
