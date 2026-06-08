import { Code2, PlayCircle, Wand2 } from 'lucide-react';
import type { BrowserNavigationWaitUntil } from '../proto/browser/automation/v1/browser_automation';
import { waitUntilLabel, waitUntilOptions } from '../api/defaults';

type CommandCardProps = {
  captureScreenshot: boolean;
  commandCount: number;
  commandsText: string;
  includeHtml: boolean;
  includeText: boolean;
  onApplyTemplate: () => void;
  onCaptureScreenshotChange: (value: boolean) => void;
  onChange: (value: string) => void;
  onExecute: () => void;
  onIncludeHtmlChange: (value: boolean) => void;
  onIncludeTextChange: (value: boolean) => void;
  onTargetUrlChange: (value: string) => void;
  onWaitUntilChange: (value: BrowserNavigationWaitUntil) => void;
  pending: boolean;
  sessionId: string;
  targetUrl: string;
  validationError: string;
  waitUntil: BrowserNavigationWaitUntil;
};

export function CommandCard(props: CommandCardProps) {
  return (
    <section className="card command-card">
      <div className="card-title">
        <div>
          <p className="section-kicker">Step 02</p>
          <h2>快捷执行</h2>
        </div>
        <span>表单生成 Proto JSON</span>
      </div>
      <div className="form-grid command-builder">
        <label className="wide">
          目标 URL
          <input autoComplete="url" inputMode="url" value={props.targetUrl} onChange={(event) => props.onTargetUrlChange(event.target.value)} placeholder="https://example.com" />
        </label>
        <label>
          等待策略
          <select value={props.waitUntil} onChange={(event) => props.onWaitUntilChange(event.target.value as BrowserNavigationWaitUntil)}>
            {waitUntilOptions.map((item) => (
              <option key={item} value={item}>{waitUntilLabel(item)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="toggle-row">
        <label><input checked={props.includeText} type="checkbox" onChange={(event) => props.onIncludeTextChange(event.target.checked)} />抓取正文</label>
        <label><input checked={props.includeHtml} type="checkbox" onChange={(event) => props.onIncludeHtmlChange(event.target.checked)} />抓取 HTML</label>
        <label><input checked={props.captureScreenshot} type="checkbox" onChange={(event) => props.onCaptureScreenshotChange(event.target.checked)} />全页截图</label>
      </div>
      <div className="actions">
        <button className="secondary" onClick={props.onApplyTemplate} type="button">
          <Wand2 size={16} />生成命令
        </button>
        <button className="primary" disabled={props.pending || !props.sessionId || Boolean(props.validationError)} onClick={props.onExecute} type="button">
          <PlayCircle size={16} />执行
        </button>
      </div>
      <p className={props.validationError ? 'json-feedback json-feedback-error' : 'json-feedback'}>
        {props.validationError || `${props.commandCount} 条命令已通过校验。`}
      </p>
      <details className="json-editor">
        <summary><Code2 size={15} />高级 Proto JSON<span className="summary-hint">按需编辑</span></summary>
        <textarea spellCheck={false} value={props.commandsText} onChange={(event) => props.onChange(event.target.value)} aria-label="Browser commands JSON" />
      </details>
    </section>
  );
}
