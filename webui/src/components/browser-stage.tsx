import type { ClipboardEvent, KeyboardEvent, MouseEvent, WheelEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { safeMessage } from '../api/safe-json';
import type { BrowserLiveFrame, BrowserLiveInputEvent } from '../proto/browser/automation/v1/browser_automation';
import { clickInput, keyboardInput, pasteInput, wheelInput } from './live-input-events';

type BrowserStageProps = {
  connected: boolean;
  error?: string;
  frame?: BrowserLiveFrame;
  onInput: (input: BrowserLiveInputEvent) => void;
  pending: boolean;
};

export function BrowserStage(props: BrowserStageProps) {
  const interactive = props.connected && Boolean(props.frame?.image_base64);
  const waiting = !interactive && !props.error;

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
    <section className="browser-stage" aria-label="云端浏览器">
      <div className="browser-shell">
        <div
          aria-busy={waiting || props.pending}
          aria-disabled={!interactive}
          aria-label={interactive ? '云端浏览器画面' : '云端浏览器正在连接'}
          className={interactive ? 'browser-viewport' : 'browser-viewport browser-viewport-disabled'}
          onClick={handleClick}
          onKeyDown={handleKeyboard}
          onPaste={handlePaste}
          onWheel={handleWheel}
          role="application"
          tabIndex={interactive ? 0 : -1}
        >
          {props.frame?.image_base64 ? (
            <img alt="云端浏览器画面" className="live-frame" src={`data:${frameContentType(props.frame)};base64,${props.frame.image_base64}`} />
          ) : (
            <Placeholder error={props.error} />
          )}
        </div>
      </div>
    </section>
  );
}

function Placeholder({ error }: { error?: string }) {
  if (error) {
    return <div className="viewport-state viewport-state-error">{safeMessage(error)}</div>;
  }
  return (
    <div className="viewport-state">
      <Loader2 className="spin" size={18} />
      <span>连接中</span>
    </div>
  );
}

function frameContentType(frame: BrowserLiveFrame) {
  return frame.content_type || 'image/jpeg';
}
