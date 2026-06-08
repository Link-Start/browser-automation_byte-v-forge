import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';
import { statusLabel, statusTone } from '../api/defaults';

type TaskListProps = {
  tasks: BrowserTask[];
};

export function TaskList({ tasks }: TaskListProps) {
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
        <div className="table-row table-head">
          <span>任务</span>
          <span>状态</span>
          <span>页面</span>
        </div>
        {tasks.map((task) => (
          <div className="table-row" key={task.task_id}>
            <span title={task.task_id}>{task.input?.task_key || task.task_id}</span>
            <span className={`status-chip ${statusTone(task.status)}`}>{statusLabel(task.status)}</span>
            <span title={task.input?.target_url || task.results?.[0]?.current_url || ''}>{task.input?.target_url || task.results?.[0]?.current_url || '-'}</span>
          </div>
        ))}
        {tasks.length === 0 ? <p className="muted empty">暂无任务。启动会话后执行一次快捷命令即可生成记录。</p> : null}
      </div>
    </section>
  );
}
