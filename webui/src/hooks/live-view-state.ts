import type { BrowserLiveFrame, BrowserLiveInputEvent, BrowserLiveView } from '../proto/browser/automation/v1/browser_automation';

export type LiveViewState = {
  connected: boolean;
  error?: string;
  frame?: BrowserLiveFrame;
  reconnecting: boolean;
  sendInput: (input: BrowserLiveInputEvent) => void;
  view?: BrowserLiveView;
};
