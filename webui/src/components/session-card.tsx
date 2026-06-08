import type { FormEvent } from 'react';
import { Play } from 'lucide-react';
import type { BrowserKind } from '../proto/browser/automation/v1/browser_automation';
import { browserKindLabel, browserKindOptions } from '../api/defaults';

type SessionCardProps = {
  browserKind: BrowserKind;
  locale: string;
  onBrowserKindChange: (value: BrowserKind) => void;
  onLocaleChange: (value: string) => void;
  onProxyRefChange: (value: string) => void;
  onStart: () => void;
  onTimezoneChange: (value: string) => void;
  pending: boolean;
  proxyRef: string;
  timezone: string;
  validationError: string;
};

export function SessionCard(props: SessionCardProps) {
  function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.pending && !props.validationError) {
      props.onStart();
    }
  }

  return (
    <form className="card session-card" onSubmit={submitSession}>
      <div className="card-title">
        <div>
          <p className="section-kicker">Step 01</p>
          <h2>会话配置</h2>
        </div>
        <span>Runtime 由服务端配置选择</span>
      </div>
      <div className="form-grid">
        <label htmlFor="browser-kind">
          浏览器内核
          <select id="browser-kind" value={props.browserKind} onChange={(event) => props.onBrowserKindChange(event.target.value as BrowserKind)}>
            {browserKindOptions.map((item) => (
              <option key={item} value={item}>{browserKindLabel(item)}</option>
            ))}
          </select>
        </label>
        <label htmlFor="proxy-ref">
          代理引用
          <input id="proxy-ref" autoComplete="off" value={props.proxyRef} onChange={(event) => props.onProxyRefChange(event.target.value)} placeholder="可选，如 register" />
        </label>
        <label htmlFor="session-locale">
          Locale
          <input id="session-locale" autoComplete="language" value={props.locale} onChange={(event) => props.onLocaleChange(event.target.value)} placeholder="en-US" />
        </label>
        <label htmlFor="session-timezone">
          Timezone
          <input id="session-timezone" autoComplete="off" value={props.timezone} onChange={(event) => props.onTimezoneChange(event.target.value)} placeholder="America/New_York" />
        </label>
      </div>
      <div className="actions">
        <button className="primary" disabled={props.pending || Boolean(props.validationError)} type="submit">
          <Play size={16} />启动会话
        </button>
      </div>
      <p className={props.validationError ? 'form-feedback form-feedback-error' : 'form-feedback'} role={props.validationError ? 'alert' : 'status'} aria-live="polite">
        {props.validationError || '配置已通过校验，启动后自动进入实时浏览器。'}
      </p>
      <p className="muted">会话 TTL：30 分钟。服务端会按 Pod 内存限制保护最大浏览器并发，用完请主动停止。</p>
    </form>
  );
}
