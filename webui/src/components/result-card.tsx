import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';

type ResultCardProps = {
  task?: BrowserTask;
};

export function ResultCard({ task }: ResultCardProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Last result</h2>
        <span>{task?.status || 'idle'}</span>
      </div>
      <pre>{task ? JSON.stringify(task, null, 2) : 'Execute a task to inspect proto JSON output.'}</pre>
    </section>
  );
}
