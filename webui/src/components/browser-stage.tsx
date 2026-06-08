import type { ReactNode } from 'react';
import { Cloud, Globe2, LockKeyhole, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';
import { statusLabel, statusTone } from '../api/defaults';

type BrowserStageProps = {
  activeSessionId: string;
  pending: boolean;
  targetUrl: string;
  task?: BrowserTask;
};

export function BrowserStage({ activeSessionId, pending, targetUrl, task }: BrowserStageProps) {
  const firstResult = task?.results?.[0];
  const currentUrl = firstResult?.current_url || task?.input?.target_url || targetUrl;
  const title = firstResult?.title || (activeSessionId ? '等待执行浏览器动作' : '启动一个云端浏览器会话');
  const preview = firstResult?.text || '这里会展示最近一次任务提取到的页面文本；没有结果时显示为隔离浏览器启动面板。';
  return (
    <section className="browser-stage" aria-label="云端浏览器预览">
      <div className="browser-shell">
        <div className="browser-topbar">
          <div className="window-dots"><span /><span /><span /></div>
          <div className="browser-tab"><Cloud size={14} />Remote Browser</div>
          <div className={`stage-status ${task ? statusTone(task.status) : 'tone-muted'}`}>{task ? statusLabel(task.status) : pending ? 'starting' : 'ready'}</div>
        </div>
        <div className="address-row">
          <LockKeyhole size={15} />
          <span title={currentUrl}>{currentUrl || 'about:blank'}</span>
        </div>
        <div className="browser-viewport">
          <div className="edge-glow" />
          <div className="viewport-copy">
            <p className="section-kicker">Isolated Session</p>
            <h2>{title}</h2>
            <p>{preview}</p>
          </div>
          <div className="node-map" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
        </div>
      </div>
      <div className="security-rail">
        <RailItem icon={<ShieldCheck size={17} />} title="隔离执行" text="会话运行在服务端 Runtime，不落本地浏览器状态。" />
        <RailItem icon={<Radar size={17} />} title="动作编排" text="Navigate、抓取、截图等命令通过 Proto 任务提交。" />
        <RailItem icon={<Globe2 size={17} />} title="网络出口" text="可绑定代理引用，适配注册与风控场景。" />
        <RailItem icon={<Sparkles size={17} />} title="结果预览" text="任务完成后即时汇总标题、正文和状态。" />
      </div>
    </section>
  );
}

type RailItemProps = {
  icon: ReactNode;
  text: string;
  title: string;
};

function RailItem({ icon, text, title }: RailItemProps) {
  return (
    <div className="rail-item">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
