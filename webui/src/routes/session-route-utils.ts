import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';
import { BrowserTaskStatus } from '../proto/browser/automation/v1/browser_automation';

export function newRequestId(scope: string) {
  return `${scope}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`;
}

export function summarizeTasks(tasks: BrowserTask[]) {
  return {
    failed: tasks.filter((task) => task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_FAILED || task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_TIMEOUT).length,
    running: tasks.filter((task) => task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_RUNNING || task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_QUEUED).length,
    succeeded: tasks.filter((task) => task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_SUCCEEDED).length,
    total: tasks.length
  };
}
