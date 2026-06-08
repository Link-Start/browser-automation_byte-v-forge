import type { BrowserCommand } from '../proto/browser/automation/v1/browser_automation';

export type CommandValidation = {
  commands: BrowserCommand[];
  error: string;
};

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
  if (!isCommandObject(value) || typeof value.command_key !== 'string' || !value.command_key.trim()) {
    return `第 ${index + 1} 条命令缺少 command_key。`;
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

function isCommandObject(value: unknown): value is { command_key?: unknown; navigate?: unknown } {
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
