import type { ClipboardEvent, KeyboardEvent, MouseEvent, WheelEvent } from 'react';
import {
  BrowserLiveInputKind,
  BrowserMouseButton,
  type BrowserLiveFrame,
  type BrowserLiveInputEvent
} from '../proto/browser/automation/v1/browser_automation';

const commandKeys = new Set(['Backspace', 'Delete', 'Enter', 'Escape', 'Home', 'End', 'PageDown', 'PageUp', 'Tab']);

export function clickInput(event: MouseEvent<HTMLElement>, frame?: BrowserLiveFrame, image?: HTMLImageElement | null): BrowserLiveInputEvent | undefined {
  const point = scaledPoint(event, frame, image);
  if (!point) return undefined;
  return baseInput(BrowserLiveInputKind.BROWSER_LIVE_INPUT_KIND_MOUSE_CLICK, {
    button: BrowserMouseButton.BROWSER_MOUSE_BUTTON_LEFT,
    x: point.x,
    y: point.y
  });
}

export function wheelInput(event: WheelEvent<HTMLElement>, frame?: BrowserLiveFrame, image?: HTMLImageElement | null): BrowserLiveInputEvent | undefined {
  const point = scaledPoint(event, frame, image);
  if (!point) return undefined;
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

function scaledPoint(event: MouseEvent<HTMLElement> | WheelEvent<HTMLElement>, frame?: BrowserLiveFrame, image?: HTMLImageElement | null) {
  const rect = renderedFrameRect(event.currentTarget, frame, image);
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return undefined;
  const width = frame?.width || rect.width;
  const height = frame?.height || rect.height;
  return { x: (x * width) / rect.width, y: (y * height) / rect.height };
}

function renderedFrameRect(target: HTMLElement, frame?: BrowserLiveFrame, image?: HTMLImageElement | null) {
  const rect = image?.getBoundingClientRect() || target.getBoundingClientRect();
  const frameWidth = frame?.width || image?.naturalWidth || rect.width;
  const frameHeight = frame?.height || image?.naturalHeight || rect.height;
  if (frameWidth <= 0 || frameHeight <= 0 || rect.width <= 0 || rect.height <= 0) return rect;
  const frameRatio = frameWidth / frameHeight;
  const rectRatio = rect.width / rect.height;
  if (rectRatio > frameRatio) {
    const width = rect.height * frameRatio;
    return new DOMRect(rect.left + (rect.width - width) / 2, rect.top, width, rect.height);
  }
  const height = rect.width / frameRatio;
  return new DOMRect(rect.left, rect.top + (rect.height - height) / 2, rect.width, height);
}
