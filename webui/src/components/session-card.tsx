import type { BrowserKind } from '../proto/browser/automation/v1/browser_automation';
import { browserKindOptions } from '../api/defaults';

type SessionCardProps = {
  browserKind: BrowserKind;
  headlessNote: string;
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
    <section className="card">
      <div className="card-title">
        <h2>Session</h2>
        <span>{props.headlessNote}</span>
      </div>
      <label>
        Browser
        <select value={props.browserKind} onChange={(event) => props.onBrowserKindChange(event.target.value as BrowserKind)}>
          {browserKindOptions.map((item) => (
            <option key={item} value={item}>{item.replace('BROWSER_KIND_', '')}</option>
          ))}
        </select>
      </label>
      <div className="grid-two">
        <label>
          Locale
          <input value={props.locale} onChange={(event) => props.onLocaleChange(event.target.value)} placeholder="en-US" />
        </label>
        <label>
          Timezone
          <input value={props.timezone} onChange={(event) => props.onTimezoneChange(event.target.value)} placeholder="America/New_York" />
        </label>
      </div>
      <label>
        Proxy ref
        <input value={props.proxyRef} onChange={(event) => props.onProxyRefChange(event.target.value)} placeholder="register" />
      </label>
      <div className="actions">
        <button disabled={props.pending} onClick={props.onStart}>Start session</button>
        <button disabled={props.pending || !props.sessionId} onClick={props.onStop}>Stop session</button>
      </div>
      <p className="muted">Active session: {props.sessionId || 'not started'}</p>
    </section>
  );
}
