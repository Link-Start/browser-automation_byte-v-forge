import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';
import { statusLabel, statusTone } from '../api/defaults';
import { safeJSONStringify } from '../api/safe-json';

type ResultCardProps = {
  task?: BrowserTask;
};

export function ResultCard({ task }: ResultCardProps) {
  const firstResult = task?.results?.[0];
  return (
    <section className="card result-card">
      <div className="card-title">
        <div>
          <p className="section-kicker">Step 03</p>
          <h2>最近结果</h2>
        </div>
        <span className={`status-chip ${task ? statusTone(task.status) : ''}`}>{task ? statusLabel(task.status) : '空闲'}</span>
      </div>
      {task ? (
        <div className="result-body">
          <div className="result-line"><span>任务 ID</span><strong title={task.task_id}>{task.task_id}</strong></div>
          <div className="result-line"><span>页面</span><strong>{firstResult?.title || firstResult?.current_url || task.input?.target_url || '-'}</strong></div>
          {task.last_error?.message ? <p className="error-box">{task.last_error.message}</p> : null}
          {firstResult?.text ? <pre className="text-preview">{firstResult.text}</pre> : null}
          <details className="json-editor">
            <summary>脱敏 Proto JSON</summary>
            <p className="json-feedback">Cookie、token、secret、凭据和代理引用会在展示前隐藏。</p>
            <pre>{safeJSONStringify(task)}</pre>
          </details>
        </div>
      ) : <p className="muted empty">执行任务后会在这里展示摘要、正文预览和脱敏 JSON。</p>}
    </section>
  );
}
