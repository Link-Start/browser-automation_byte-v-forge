import type { ClipboardEvent, KeyboardEvent, MouseEvent, WheelEvent } from 'react';
import { Cloud, LockKeyhole } from 'lucide-react';
import { safeMessage, safeURL } from '../api/safe-json';
import type { BrowserLiveFrame, BrowserLiveInputEvent } from '../proto/browser/automation/v1/browser_automation';
import { clickInput, keyboardInput, pasteInput, wheelInput } from './live-input-events';

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
};

export function BrowserStage(props: BrowserStageProps) {
  const currentUrl = props.frame?.current_url || props.targetUrl;
  const displayUrl = safeURL(currentUrl || 'about:blank');
  const interactive = props.connected && Boolean(props.frame?.image_base64);
  const status = stageStatus(props.error, props.connected, props.pending, interactive);
  const title = props.frame?.title || props.placeholderTitle || (props.activeSessionId ? '等待浏览器画面' : '启动一个云端浏览器会话');
  const preview = props.placeholderPreview || '启动后显示画面。';

  function dispatch(input?: BrowserLiveInputEvent) {
    if (interactive && input) {
      props.onInput(input);
    }
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!interactive) return;
    event.currentTarget.focus();
    dispatch(clickInput(event, props.frame));
  }

  function handleKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (!interactive) return;
    const input = keyboardInput(event);
    if (!input) return;
    event.preventDefault();
    dispatch(input);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    if (!interactive) return;
    const input = pasteInput(event);
    if (!input) return;
    event.preventDefault();
    dispatch(input);
  }

  function handleWheel(event: WheelEvent<HTMLElement>) {
    if (!interactive) return;
    event.preventDefault();
    dispatch(wheelInput(event, props.frame));
  }

  return (
    <section className="browser-stage" aria-label="云端浏览器预览">
      <div className="browser-shell">
        <div className="browser-topbar">
          <div className="window-dots"><span /><span /><span /></div>
          <div className="browser-tab"><Cloud size={14} />Cloud Browser</div>
          <div className={`stage-status ${status.tone}`}>{status.label}</div>
        </div>
        <div className="address-row">
          <LockKeyhole size={15} />
          <span title={displayUrl}>{displayUrl}</span>
        </div>
        <div
          aria-disabled={!interactive}
          aria-label={interactive ? '远端浏览器交互画面' : '远端浏览器画面尚未可交互'}
          className={interactive ? 'browser-viewport' : 'browser-viewport browser-viewport-disabled'}
          onClick={handleClick}
          onKeyDown={handleKeyboard}
          onPaste={handlePaste}
          onWheel={handleWheel}
          role="application"
          tabIndex={interactive ? 0 : -1}
        >
          {props.frame?.image_base64 ? (
            <img alt="Remote browser live frame" className="live-frame" src={`data:${frameContentType(props.frame)};base64,${props.frame.image_base64}`} />
          ) : (
            <Placeholder title={title} preview={preview} />
          )}
          <div className="control-hint">{interactive ? '可操作' : '连接中'}</div>
        </div>
      </div>
    </section>
  );
}

function Placeholder({ preview, title }: { preview: string; title: string }) {
  return (
    <>
      <div className="viewport-copy">
        <Cloud size={30} />
        <h2>{title}</h2>
        <p>{preview}</p>
      </div>
    </>
  );
}

function frameContentType(frame: BrowserLiveFrame) {
  return frame.content_type || 'image/jpeg';
}

function stageStatus(error: string | undefined, connected: boolean, pending: boolean, interactive: boolean) {
  if (error) return { label: safeMessage(error), tone: 'tone-danger' };
  if (interactive) return { label: '可交互', tone: 'tone-success' };
  if (connected) return { label: '等待首帧', tone: 'tone-warn' };
  if (pending) return { label: '连接中', tone: 'tone-warn' };
  return { label: '未连接', tone: 'tone-muted' };
}
