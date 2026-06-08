import type { MouseEvent, ReactNode, WheelEvent } from 'react';
import { Cloud, Globe2, LockKeyhole, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import {
  BrowserLiveInputKind,
  BrowserMouseButton,
  type BrowserLiveFrame,
  type BrowserLiveInputEvent,
  type BrowserTask
} from '../proto/browser/automation/v1/browser_automation';
import { statusLabel, statusTone } from '../api/defaults';

type BrowserStageProps = {
  activeSessionId: string;
  connected: boolean;
  error?: string;
  frame?: BrowserLiveFrame;
  onInput: (input: BrowserLiveInputEvent) => void;
  pending: boolean;
  placeholderPreview?: string;
  placeholderTitle?: string;
  targetUrl: string;
  task?: BrowserTask;
};

export function BrowserStage(props: BrowserStageProps) {
  const firstResult = props.task?.results?.[0];
  const currentUrl = props.frame?.current_url || firstResult?.current_url || props.task?.input?.target_url || props.targetUrl;
  const title = props.frame?.title || firstResult?.title || props.placeholderTitle || (props.activeSessionId ? '等待浏览器画面' : '启动一个云端浏览器会话');
  const preview = firstResult?.text || props.placeholderPreview || 'CDP Live View 会在启动会话后把远端 Chromium 画面推到这里。';
  return (
    <section className="browser-stage" aria-label="云端浏览器预览">
      <div className="browser-shell">
        <div className="browser-topbar">
          <div className="window-dots"><span /><span /><span /></div>
          <div className="browser-tab"><Cloud size={14} />Remote Browser</div>
          <div className={`stage-status ${props.task ? statusTone(props.task.status) : 'tone-muted'}`}>{props.error || (props.connected ? 'live' : props.pending ? 'starting' : props.task ? statusLabel(props.task.status) : 'ready')}</div>
        </div>
        <div className="address-row">
          <LockKeyhole size={15} />
          <span title={currentUrl}>{currentUrl || 'about:blank'}</span>
        </div>
        <div className="browser-viewport" onClick={(event) => props.onInput(toMouseClick(event, props.frame))} onWheel={(event) => props.onInput(toWheel(event, props.frame))}>
          {props.frame?.image_base64 ? <img alt="Remote browser live frame" className="live-frame" src={`data:${props.frame.content_type};base64,${props.frame.image_base64}`} /> : <Placeholder title={title} preview={preview} />}
        </div>
      </div>
      <div className="security-rail">
        <RailItem icon={<ShieldCheck size={17} />} title="CDP Live View" text="首版 Provider 走 Chromium CDP，后续可替换 WebRTC / Screenshot。" />
        <RailItem icon={<Radar size={17} />} title="可替换路径" text="前端只依赖 LiveView API，不绑定具体传输实现。" />
        <RailItem icon={<Globe2 size={17} />} title="输入回放" text="点击和滚轮通过 LiveView input 事件回放到远端页面。" />
        <RailItem icon={<Sparkles size={17} />} title="任务联动" text="自动化任务结果与实时画面共用同一个 session。" />
      </div>
    </section>
  );
}

function Placeholder({ preview, title }: { preview: string; title: string }) {
  return <><div className="edge-glow" /><div className="viewport-copy"><p className="section-kicker">Isolated Session</p><h2>{title}</h2><p>{preview}</p></div><div className="node-map" aria-hidden="true"><i /><i /><i /><i /></div></>;
}

type RailItemProps = { icon: ReactNode; text: string; title: string };

function RailItem({ icon, text, title }: RailItemProps) {
  return <div className="rail-item"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function toMouseClick(event: MouseEvent<HTMLElement>, frame?: BrowserLiveFrame): BrowserLiveInputEvent {
  const point = scaledPoint(event, frame);
  return { kind: BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_MOUSE_CLICK, x: point.x, y: point.y, delta_x: 0, delta_y: 0, button: BrowserMouseButton.BROWSER_MOUSE_BUTTON_LEFT, key: '', text: '' };
}

function toWheel(event: WheelEvent<HTMLElement>, frame?: BrowserLiveFrame): BrowserLiveInputEvent {
  event.preventDefault();
  const point = scaledPoint(event, frame);
  return { kind: BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_MOUSE_WHEEL, x: point.x, y: point.y, delta_x: event.deltaX, delta_y: event.deltaY, button: BrowserMouseButton.BROWSER_MOUSE_BUTTON_UNSPECIFIED, key: '', text: '' };
}

function scaledPoint(event: MouseEvent<HTMLElement> | WheelEvent<HTMLElement>, frame?: BrowserLiveFrame) {
  const rect = event.currentTarget.getBoundingClientRect();
  const width = frame?.width || rect.width;
  const height = frame?.height || rect.height;
  return { x: ((event.clientX - rect.left) * width) / rect.width, y: ((event.clientY - rect.top) * height) / rect.height };
}
