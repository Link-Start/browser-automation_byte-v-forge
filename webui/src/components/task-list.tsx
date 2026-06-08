import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';

type TaskListProps = {
  tasks: BrowserTask[];
};

export function TaskList({ tasks }: TaskListProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Recent tasks</h2>
        <span>{tasks.length} shown</span>
      </div>
      <div className="table">
        <div className="table-row table-head">
          <span>Task</span>
          <span>Status</span>
          <span>URL</span>
        </div>
        {tasks.map((task) => (
          <div className="table-row" key={task.task_id}>
            <span title={task.task_id}>{task.task_id}</span>
            <span>{task.status}</span>
            <span>{task.input?.target_url || task.results?.[0]?.current_url || '-'}</span>
          </div>
        ))}
        {tasks.length === 0 ? <p className="muted empty">No tasks yet.</p> : null}
      </div>
    </section>
  );
}
