import { Code2, MonitorDot } from 'lucide-react';
import { Link } from 'react-router';
import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';
import { statusLabel, statusTone } from '../api/defaults';
import { paths } from '../routes/paths';

type TaskListProps = {
  sessionId: string;
  tasks: BrowserTask[];
};

export function TaskList({ sessionId, tasks }: TaskListProps) {
  return (
    <section className="card task-card">
      <div className="card-title">
        <div>
          <p className="section-kicker">History</p>
          <h2>任务记录</h2>
        </div>
        <span>{tasks.length} 条</span>
      </div>
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
            <span title={taskURL(task)}>
              {taskTitle(task)}
              <small>{taskMeta(task)}</small>
              {task.last_error?.message ? <em>{task.last_error.message}</em> : null}
            </span>
            <span className="task-actions">
              <Link className="mini-link" to={paths.sessionLive(sessionId)} title="打开实时浏览器"><MonitorDot size={14} />Live</Link>
              <Link className="mini-link" to={paths.sessionCommands(sessionId)} title="继续执行命令"><Code2 size={14} />命令</Link>
            </span>
          </div>
        ))}
        {tasks.length === 0 ? <EmptyTasks sessionId={sessionId} /> : null}
      </div>
    </section>
  );
}

function EmptyTasks({ sessionId }: { sessionId: string }) {
  return (
    <p className="muted empty">
      暂无任务。<Link to={paths.sessionCommands(sessionId)}>去执行一次快捷命令</Link> 后会在这里展示历史记录。
    </p>
  );
}

function taskTitle(task: BrowserTask) {
  return task.results?.[0]?.title || taskURL(task) || '-';
}

function taskURL(task: BrowserTask) {
  return task.input?.target_url || task.results?.[0]?.current_url || '';
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
