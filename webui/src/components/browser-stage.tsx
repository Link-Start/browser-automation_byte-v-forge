import { Card, Spinner, Text } from '@radix-ui/themes';
import { useRef, type ClipboardEvent, type KeyboardEvent, type MouseEvent, type WheelEvent } from 'react';
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
  const imageRef = useRef<HTMLImageElement>(null);
  const interactive = props.connected && Boolean(props.frame?.image_base64);
  const waiting = !interactive && !props.error;

  function dispatch(input?: BrowserLiveInputEvent) {
    if (interactive && input) props.onInput(input);
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!interactive) return;
    event.currentTarget.focus();
    event.preventDefault();
    dispatch(clickInput(event, props.frame, imageRef.current));
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
    dispatch(wheelInput(event, props.frame, imageRef.current));
  }

  return (
    <Card className="browser-stage" aria-label="云端浏览器">
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
        {props.frame?.image_base64 ? <img alt="云端浏览器画面" className="live-frame" draggable={false} ref={imageRef} src={`data:${frameContentType(props.frame)};base64,${props.frame.image_base64}`} /> : <Placeholder error={props.error} />}
      </div>
    </Card>
  );
}

function Placeholder({ error }: { error?: string }) {
  if (error) return <Text as="div" className="viewport-state viewport-state-error" color="red">{safeMessage(error)}</Text>;
  return <Text as="div" className="viewport-state" color="gray"><Spinner size="2" />连接中</Text>;
}

function frameContentType(frame: BrowserLiveFrame) {
  return frame.content_type || 'image/jpeg';
}
