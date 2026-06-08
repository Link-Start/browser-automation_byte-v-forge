import type { ClipboardEvent, KeyboardEvent, MouseEvent, WheelEvent } from 'react';
import {
  BrowserLiveInputKind,
  BrowserMouseButton,
  type BrowserLiveFrame,
  type BrowserLiveInputEvent
} from '../proto/browser/automation/v1/browser_automation';

const commandKeys = new Set(['Backspace', 'Delete', 'Enter', 'Escape', 'Home', 'End', 'PageDown', 'PageUp', 'Tab']);

export function clickInput(event: MouseEvent<HTMLElement>, frame?: BrowserLiveFrame): BrowserLiveInputEvent {
  const point = scaledPoint(event, frame);
  return baseInput(BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_MOUSE_CLICK, {
    button: BrowserMouseButton.BROWSER_MOUSE_BUTTON_LEFT,
    x: point.x,
    y: point.y
  });
}

export function wheelInput(event: WheelEvent<HTMLElement>, frame?: BrowserLiveFrame): BrowserLiveInputEvent {
  const point = scaledPoint(event, frame);
  return baseInput(BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_MOUSE_WHEEL, {
    button: BrowserMouseButton.BROWSER_MOUSE_BUTTON_UNSPECIFIED,
    delta_x: event.deltaX,
    delta_y: event.deltaY,
    x: point.x,
    y: point.y
  });
}

export function keyboardInput(event: KeyboardEvent<HTMLElement>): BrowserLiveInputEvent | undefined {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return undefined;
  }
  if (event.key.length === 1) {
    return baseInput(BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_TYPE_TEXT, { text: event.key });
  }
  if (commandKeys.has(event.key) || event.key.startsWith('Arrow')) {
    return baseInput(BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_KEY_PRESS, { key: event.key });
  }
  return undefined;
}

export function pasteInput(event: ClipboardEvent<HTMLElement>): BrowserLiveInputEvent | undefined {
  const text = event.clipboardData.getData('text');
  return text ? baseInput(BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_TYPE_TEXT, { text }) : undefined;
}

function baseInput(kind: BrowserLiveInputKind, patch: Partial<BrowserLiveInputEvent>): BrowserLiveInputEvent {
  return { button: BrowserMouseButton.BROWSER_MOUSE_BUTTON_UNSPECIFIED, delta_x: 0, delta_y: 0, key: '', kind, text: '', x: 0, y: 0, ...patch };
}

function scaledPoint(event: MouseEvent<HTMLElement> | WheelEvent<HTMLElement>, frame?: BrowserLiveFrame) {
  const rect = event.currentTarget.getBoundingClientRect();
  const width = frame?.width || rect.width;
  const height = frame?.height || rect.height;
  return { x: ((event.clientX - rect.left) * width) / rect.width, y: ((event.clientY - rect.top) * height) / rect.height };
}
