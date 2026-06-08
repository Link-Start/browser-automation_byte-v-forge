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
  const invalidIndex = parsed.findIndex((item) => !isCommandObject(item) || typeof item.command_key !== 'string' || !item.command_key.trim());
  if (invalidIndex >= 0) {
    return invalid(`第 ${invalidIndex + 1} 条命令缺少 command_key。`);
  }
  return { commands: parsed as BrowserCommand[], error: '' };
}

function invalid(error: string): CommandValidation {
  return { commands: [], error };
}

function isCommandObject(value: unknown): value is { command_key?: unknown } {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
