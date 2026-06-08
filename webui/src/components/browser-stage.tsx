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
  const title = props.frame?.title || props.placeholderTitle || (props.activeSessionId ? '等待浏览器画面' : '启动一个云端浏览器会话');
  const preview = props.placeholderPreview || 'CDP Live View 会在启动会话后把远端 Chromium 画面推到这里。';

  function dispatch(input?: BrowserLiveInputEvent) {
    if (input) {
      props.onInput(input);
    }
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    event.currentTarget.focus();
    dispatch(clickInput(event, props.frame));
  }

  function handleKeyboard(event: KeyboardEvent<HTMLElement>) {
    const input = keyboardInput(event);
    if (!input) return;
    event.preventDefault();
    dispatch(input);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const input = pasteInput(event);
    if (!input) return;
    event.preventDefault();
    dispatch(input);
  }

  function handleWheel(event: WheelEvent<HTMLElement>) {
    event.preventDefault();
    dispatch(wheelInput(event, props.frame));
  }

  return (
    <section className="browser-stage" aria-label="云端浏览器预览">
      <div className="browser-shell">
        <div className="browser-topbar">
          <div className="window-dots"><span /><span /><span /></div>
          <div className="browser-tab"><Cloud size={14} />Remote Browser</div>
          <div className="stage-status tone-muted">{props.error ? safeMessage(props.error) : props.connected ? 'live' : props.pending ? 'starting' : 'ready'}</div>
        </div>
        <div className="address-row">
          <LockKeyhole size={15} />
          <span title={displayUrl}>{displayUrl}</span>
        </div>
        <div
          aria-label="远端浏览器交互画面"
          className="browser-viewport"
          onClick={handleClick}
          onKeyDown={handleKeyboard}
          onPaste={handlePaste}
          onWheel={handleWheel}
          role="application"
          tabIndex={0}
        >
          {props.frame?.image_base64 ? (
            <img alt="Remote browser live frame" className="live-frame" src={`data:${props.frame.content_type};base64,${props.frame.image_base64}`} />
          ) : (
            <Placeholder title={title} preview={preview} />
          )}
          <div className="control-hint">{props.connected ? '点击画面聚焦；支持键盘输入、粘贴和滚轮。' : '等待 LiveView 连接后即可操作远端浏览器。'}</div>
        </div>
      </div>
    </section>
  );
}

function Placeholder({ preview, title }: { preview: string; title: string }) {
  return (
    <>
      <div className="edge-glow" />
      <div className="viewport-copy">
        <p className="section-kicker">Isolated Session</p>
        <h2>{title}</h2>
        <p>{preview}</p>
      </div>
      <div className="node-map" aria-hidden="true"><i /><i /><i /><i /></div>
    </>
  );
}
