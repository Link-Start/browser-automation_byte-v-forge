import { Play, Square } from 'lucide-react';
import type { BrowserKind } from '../proto/browser/automation/v1/browser_automation';
import { browserKindLabel, browserKindOptions } from '../api/defaults';

type SessionCardProps = {
  browserKind: BrowserKind;
  locale: string;
  onBrowserKindChange: (value: BrowserKind) => void;
  onLocaleChange: (value: string) => void;
  onProxyRefChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onTimezoneChange: (value: string) => void;
  pending: boolean;
  proxyRef: string;
  sessionId: string;
  timezone: string;
};

export function SessionCard(props: SessionCardProps) {
  return (
    <section className="card session-card">
      <div className="card-title">
        <div>
          <p className="section-kicker">Step 01</p>
          <h2>会话配置</h2>
        </div>
        <span>Runtime 由服务端配置选择</span>
      </div>
      <div className="form-grid">
        <label>
          浏览器内核
          <select value={props.browserKind} onChange={(event) => props.onBrowserKindChange(event.target.value as BrowserKind)}>
            {browserKindOptions.map((item) => (
              <option key={item} value={item}>{browserKindLabel(item)}</option>
            ))}
          </select>
        </label>
        <label>
          代理引用
          <input value={props.proxyRef} onChange={(event) => props.onProxyRefChange(event.target.value)} placeholder="可选，如 register" />
        </label>
        <label>
          Locale
          <input value={props.locale} onChange={(event) => props.onLocaleChange(event.target.value)} placeholder="en-US" />
        </label>
        <label>
          Timezone
          <input value={props.timezone} onChange={(event) => props.onTimezoneChange(event.target.value)} placeholder="America/New_York" />
        </label>
      </div>
      <div className="actions">
        <button className="primary" disabled={props.pending} onClick={props.onStart}>
          <Play size={16} />启动会话
        </button>
        <button className="secondary" disabled={props.pending || !props.sessionId} onClick={props.onStop}>
          <Square size={16} />停止会话
        </button>
      </div>
      <p className="muted">会话 TTL：30 分钟。业务流程应在用完后主动停止，避免长期占用浏览器资源。</p>
    </section>
  );
}
