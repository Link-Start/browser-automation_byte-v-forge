import {
  BrowserKind,
  BrowserNavigationWaitUntil,
  type BrowserCommand
} from '../proto/browser/automation/v1/browser_automation';

export const browserKindOptions: BrowserKind[] = [BrowserKind.BROWSER_KIND_CHROMIUM, BrowserKind.BROWSER_KIND_FIREFOX];

export const defaultCommands: BrowserCommand[] = [
  {
    command_id: '',
    command_key: 'open',
    timeout: undefined,
    continue_on_error: false,
    labels: {},
    navigate: {
      url: 'https://example.com',
      wait_until: BrowserNavigationWaitUntil.BROWSER_NAVIGATION_WAIT_UNTIL_LOAD,
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
      include_text: true,
      include_html: false
    }
  }
];

export function formatJSON(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
