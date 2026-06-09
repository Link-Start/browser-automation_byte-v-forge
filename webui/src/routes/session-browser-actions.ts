import {
  BrowserNavigationWaitUntil,
  type BrowserCommand,
  type ExecuteBrowserCommandsRequest
} from '../proto/browser/automation/v1/browser_automation';
import { newRequestId } from './request-id';

export type SessionBrowserAction = 'back' | 'forward' | 'navigate' | 'reload';

const waitUntil = BrowserNavigationWaitUntil.BROWSER_NAVIGATION_WAIT_UNTIL_LOAD;

export function buildSessionBrowserRequest(sessionId: string, action: SessionBrowserAction, targetUrl: string): ExecuteBrowserCommandsRequest {
  return {
    request_id: newRequestId('task'),
    input: {
      commands: [browserCommand(action, targetUrl)],
      labels: { source: 'standalone-webui' },
      scenario_key: '',
      security_policy: undefined,
      session_id: sessionId,
      target_url: targetUrl,
      task_key: `webui.cloud_browser.${action}`,
      timeout: '45s'
    }
  };
}

function browserCommand(action: SessionBrowserAction, targetUrl: string): BrowserCommand {
  const command = baseCommand(action);
  if (action === 'navigate') {
    return { ...command, navigate: { timeout: '30s', url: targetUrl, wait_until: waitUntil } };
  }
  if (action === 'reload') {
    return { ...command, reload: { timeout: '30s', wait_until: waitUntil } };
  }
  if (action === 'back') {
    return { ...command, go_back: { timeout: '30s', wait_until: waitUntil } };
  }
  return { ...command, go_forward: { timeout: '30s', wait_until: waitUntil } };
}

function baseCommand(action: SessionBrowserAction): BrowserCommand {
  return { command_id: '', command_key: action, continue_on_error: false, labels: {}, timeout: undefined };
}
