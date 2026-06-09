import type { FormEvent, ReactNode } from 'react';
import { Cloud, Code2, ExternalLink, Globe2, LockKeyhole, MonitorDot, Play, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { browserKindLabel, sessionStatusLabel } from '../api/defaults';
import { BrowserKind, type BrowserSession } from '../proto/browser/automation/v1/browser_automation';
import { paths } from '../routes/paths';

type CloudBrowserLauncherProps = {
  disabled: boolean;
  launchError?: string;
  launching: boolean;
  onLaunch: () => void;
  onTargetUrlChange: (value: string) => void;
  recentSession?: BrowserSession;
  sessionCount: number;
  targetUrl: string;
  validationError: string;
};

export function CloudBrowserLauncher(props: CloudBrowserLauncherProps) {
  const feedback = props.validationError || props.launchError || '输入地址后直接启动隔离浏览器，会话会自动进入左侧列表。';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.disabled && !props.validationError) {
      props.onLaunch();
    }
  }

  return (
    <section className="cloud-browser-card" aria-label="云浏览器">
      <form className="cloud-browser-shell" onSubmit={submit}>
        <div className="cloud-browser-topbar">
          <div className="window-dots"><span /><span /><span /></div>
          <div className="browser-tab"><Cloud size={14} />Cloud Browser</div>
          <span className="stage-status tone-success"><ShieldCheck size={12} />Isolated</span>
        </div>
        <label className="cloud-address-bar" htmlFor="cloud-browser-target">
          <LockKeyhole size={15} />
          <input
            id="cloud-browser-target"
            aria-describedby="cloud-browser-feedback"
            aria-invalid={Boolean(props.validationError || props.launchError)}
            autoComplete="url"
            inputMode="url"
            onChange={(event) => props.onTargetUrlChange(event.target.value)}
            placeholder="https://example.com"
            value={props.targetUrl}
          />
          <button className="primary" disabled={props.disabled || Boolean(props.validationError)} type="submit">
            {props.launching ? <Sparkles className="spin" size={16} /> : <Play size={16} />}启动
          </button>
        </label>
        <p id="cloud-browser-feedback" className={props.validationError || props.launchError ? 'form-feedback form-feedback-error' : 'form-feedback'} role={props.validationError || props.launchError ? 'alert' : 'status'} aria-live="polite">
          {feedback}
        </p>
        <div className="cloud-browser-viewport">
          <div className="edge-glow" />
          <div className="cloud-browser-copy">
            <p className="section-kicker">Remote isolated browser</p>
            <h2>{props.recentSession ? '继续最近的云浏览器' : '像打开浏览器一样启动会话'}</h2>
            <p>把“新建 / 输入 ID / 再进 Live”的后台路径收敛成一个地址栏：输入 URL，启动，进入远端浏览器。</p>
            <div className="cloud-browser-actions">
              {props.recentSession ? <RecentSessionAction session={props.recentSession} /> : null}
              <Link className="mini-link" to={paths.openSession}><Radio size={14} />高级接管</Link>
            </div>
          </div>
          <div className="cloud-browser-stats" aria-label="会话摘要">
            <Metric icon={<MonitorDot size={16} />} label="可见会话" value={String(props.sessionCount)} />
            <Metric icon={<Globe2 size={16} />} label="入口" value="URL Launch" />
            <Metric icon={<Code2 size={16} />} label="控制" value="CDP" />
          </div>
        </div>
      </form>
    </section>
  );
}

function RecentSessionAction({ session }: { session: BrowserSession }) {
  return (
    <Link className="link-button primary" to={paths.sessionLive(session.session_id)}>
      <ExternalLink size={16} />进入 {browserKindLabel(session.profile?.browser_kind || BrowserKind.BROWSER_KIND_UNSPECIFIED)} · {sessionStatusLabel(session.status)}
    </Link>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <span>{icon}<strong>{value}</strong><small>{label}</small></span>;
}
