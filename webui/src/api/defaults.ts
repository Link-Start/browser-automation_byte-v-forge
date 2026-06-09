import {
  BrowserKind,
  BrowserNavigationWaitUntil,
  BrowserSessionStatus,
  BrowserTaskStatus,
  type BrowserCommand
} from '../proto/browser/automation/v1/browser_automation';

export const browserKindOptions: BrowserKind[] = [BrowserKind.BROWSER_KIND_CHROMIUM, BrowserKind.BROWSER_KIND_FIREFOX];

export const waitUntilOptions: BrowserNavigationWaitUntil[] = [
  BrowserNavigationWaitUntil.BROWSER_NAVIGATION_WAIT_UNTIL_LOAD,
  BrowserNavigationWaitUntil.BROWSER_NAVIGATION_WAIT_UNTIL_DOM_CONTENT_LOADED,
  BrowserNavigationWaitUntil.BROWSER_NAVIGATION_WAIT_UNTIL_NETWORK_IDLE
];

export type QuickCommandOptions = {
  captureScreenshot: boolean;
  includeHtml: boolean;
  includeText: boolean;
  targetUrl: string;
  waitUntil: BrowserNavigationWaitUntil;
};

export const defaultQuickCommand: QuickCommandOptions = {
  captureScreenshot: false,
  includeHtml: false,
  includeText: true,
  targetUrl: 'https://example.com',
  waitUntil: BrowserNavigationWaitUntil.BROWSER_NAVIGATION_WAIT_UNTIL_LOAD
};

export function buildQuickCommands(options: QuickCommandOptions): BrowserCommand[] {
  const commands: BrowserCommand[] = [
    {
      command_id: '',
      command_key: 'open',
      timeout: undefined,
      continue_on_error: false,
      labels: {},
      navigate: {
        url: options.targetUrl.trim(),
        wait_until: options.waitUntil,
        timeout: '30s'
      }
    },
    {
      command_id: '',
      command_key: 'state',
      timeout: undefined,
      continue_on_error: false,
      labels: {},
      get_page_state: {
        include_title: true,
        include_text: options.includeText,
        include_html: options.includeHtml
      }
    }
  ];
  if (options.captureScreenshot) {
    commands.push({
      command_id: '',
      command_key: 'screenshot',
      timeout: undefined,
      continue_on_error: false,
      labels: {},
      screenshot: { artifact_key: 'webui.full_page', full_page: true, timeout: '30s', selector: undefined, selector_group: undefined }
    });
  }
  return commands;
}

export function browserKindLabel(value: BrowserKind): string {
  return value.replace('BROWSER_KIND_', '').toLowerCase();
}

export function waitUntilLabel(value: BrowserNavigationWaitUntil): string {
  return value.replace('BROWSER_NAVIGATION_WAIT_UNTIL_', '').replaceAll('_', ' ').toLowerCase();
}

export function statusLabel(value?: BrowserTaskStatus): string {
  return (value || 'BROWSER_TASK_STATUS_UNSPECIFIED').replace('BROWSER_TASK_STATUS_', '').replaceAll('_', ' ').toLowerCase();
}

export function statusTone(value?: BrowserTaskStatus): string {
  if (value === BrowserTaskStatus.BROWSER_TASK_STATUS_SUCCEEDED) return 'tone-success';
  if (value === BrowserTaskStatus.BROWSER_TASK_STATUS_FAILED || value === BrowserTaskStatus.BROWSER_TASK_STATUS_TIMEOUT) return 'tone-danger';
  if (value === BrowserTaskStatus.BROWSER_TASK_STATUS_RUNNING || value === BrowserTaskStatus.BROWSER_TASK_STATUS_QUEUED) return 'tone-warn';
  return 'tone-muted';
}

export type ThemeColor = 'amber' | 'gray' | 'green' | 'orange' | 'red';

export function statusThemeColor(value?: BrowserTaskStatus): ThemeColor {
  if (value === BrowserTaskStatus.BROWSER_TASK_STATUS_SUCCEEDED) return 'green';
  if (value === BrowserTaskStatus.BROWSER_TASK_STATUS_FAILED || value === BrowserTaskStatus.BROWSER_TASK_STATUS_TIMEOUT) return 'red';
  if (value === BrowserTaskStatus.BROWSER_TASK_STATUS_RUNNING || value === BrowserTaskStatus.BROWSER_TASK_STATUS_QUEUED) return 'amber';
  return 'gray';
}

export function formatJSON(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function sessionStatusLabel(value?: BrowserSessionStatus): string {
  return (value || 'BROWSER_SESSION_STATUS_UNSPECIFIED').replace('BROWSER_SESSION_STATUS_', '').replaceAll('_', ' ').toLowerCase();
}

export function sessionStatusTone(value?: BrowserSessionStatus): string {
  if (value === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING) return 'tone-success';
  if (value === BrowserSessionStatus.BROWSER_SESSION_STATUS_FAILED || value === BrowserSessionStatus.BROWSER_SESSION_STATUS_EXPIRED) return 'tone-danger';
  if (value === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING || value === BrowserSessionStatus.BROWSER_SESSION_STATUS_STOPPING) return 'tone-warn';
  return 'tone-muted';
}

export function sessionStatusThemeColor(value?: BrowserSessionStatus): ThemeColor {
  if (value === BrowserSessionStatus.BROWSER_SESSION_STATUS_RUNNING) return 'green';
  if (value === BrowserSessionStatus.BROWSER_SESSION_STATUS_FAILED || value === BrowserSessionStatus.BROWSER_SESSION_STATUS_EXPIRED) return 'red';
  if (value === BrowserSessionStatus.BROWSER_SESSION_STATUS_STARTING || value === BrowserSessionStatus.BROWSER_SESSION_STATUS_STOPPING) return 'amber';
  return 'gray';
}
