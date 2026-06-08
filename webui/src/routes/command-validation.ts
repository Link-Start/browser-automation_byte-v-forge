import type { BrowserCommand } from '../proto/browser/automation/v1/browser_automation';

export type CommandValidation = {
  commands: BrowserCommand[];
  error: string;
};

const commandOperationFields = [
  'blur',
  'clear',
  'click',
  'count_elements',
  'drag',
  'evaluate',
  'extract_element',
  'extract_text',
  'fill',
  'focus',
  'get_attribute',
  'get_cookies',
  'get_network_requests',
  'get_page_state',
  'get_storage_state',
  'go_back',
  'go_forward',
  'hover',
  'mouse_click',
  'mouse_down',
  'mouse_move',
  'mouse_up',
  'navigate',
  'press',
  'reload',
  'screenshot',
  'scroll',
  'select_option',
  'set_checked',
  'submit_form',
  'type_text',
  'upload_file',
  'wait_for_load_state',
  'wait_for_network_request',
  'wait_for_selector',
  'wait_for_text',
  'wait_for_timeout',
  'wait_for_url'
] as const;

export function validateBrowserCommands(value: string): CommandValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return invalid('命令 JSON 格式不正确，请检查括号、逗号和引号。');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return invalid('commands 必须是非空数组。');
  }
  for (const [index, item] of parsed.entries()) {
    const error = validateCommand(item, index);
    if (error) {
      return invalid(error);
    }
  }
  return { commands: parsed as BrowserCommand[], error: '' };
}

function invalid(error: string): CommandValidation {
  return { commands: [], error };
}

function validateCommand(value: unknown, index: number) {
  if (!isCommandObject(value)) {
    return `第 ${index + 1} 条命令必须是对象。`;
  }
  if (typeof value.command_key !== 'string' || !value.command_key.trim()) {
    return `第 ${index + 1} 条命令缺少 command_key。`;
  }
  const operationFields = commandOperationFields.filter((field) => value[field] !== undefined);
  if (operationFields.length === 0) {
    return `第 ${index + 1} 条命令缺少操作类型。`;
  }
  if (operationFields.length > 1) {
    return `第 ${index + 1} 条命令只能包含一个操作类型。`;
  }
  if (value.navigate !== undefined) {
    return validateNavigation(value.navigate, index);
  }
  return '';
}

function validateNavigation(value: unknown, index: number) {
  if (!isRecord(value) || typeof value.url !== 'string' || !value.url.trim()) {
    return `第 ${index + 1} 条导航命令缺少 url。`;
  }
  if (!isAllowedNavigationURL(value.url.trim())) {
    return `第 ${index + 1} 条导航 URL 仅支持 http(s) 或 about:blank。`;
  }
  return '';
}

function isCommandObject(value: unknown): value is Record<string, unknown> & { command_key?: unknown; navigate?: unknown } {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isAllowedNavigationURL(value: string) {
  if (value === 'about:blank') {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
