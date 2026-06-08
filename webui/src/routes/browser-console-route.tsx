import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  BrowserKind,
  BrowserTaskStatus,
  type BrowserCommand,
  type BrowserTask
} from '../proto/browser/automation/v1/browser_automation';
import { executeCommands, listTasks, startSession, stopSession } from '../api/browser-api';
import { buildQuickCommands, defaultQuickCommand, formatJSON, type QuickCommandOptions } from '../api/defaults';
import { BrowserStage } from '../components/browser-stage';
import { CommandCard } from '../components/command-card';
import { PageHeader } from '../components/page-header';
import { ResultCard } from '../components/result-card';
import { SessionCard } from '../components/session-card';
import { Status } from '../components/status';
import { SummaryCard } from '../components/summary-card';
import { TaskList } from '../components/task-list';
import { useLiveView } from '../hooks/use-live-view';
import { paths } from './paths';

export function BrowserConsoleRoute() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId = '' } = useParams();
  const sessionId = routeSessionId.trim();
  const [browserKind, setBrowserKind] = useState<BrowserKind>(BrowserKind.BROWSER_KIND_CHROMIUM);
  const [quickCommand, setQuickCommand] = useState(defaultQuickCommand);
  const [commandsText, setCommandsText] = useState(formatJSON(buildQuickCommands(defaultQuickCommand)));
  const [lastTask, setLastTask] = useState<BrowserTask>();
  const [locale, setLocale] = useState('en-US');
  const [proxyRef, setProxyRef] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const tasks = useQuery({ queryKey: ['tasks', sessionId], queryFn: () => listTasks(sessionId), refetchInterval: 8000 });
  const liveView = useLiveView(sessionId);
  const start = useMutation({ mutationFn: handleStart, onSuccess: (response) => response.session?.session_id && navigate(paths.session(response.session.session_id)) });
  const stop = useMutation({ mutationFn: () => stopSession(sessionId, 'webui stop'), onSuccess: () => navigate(paths.sessions) });
  const execute = useMutation({ mutationFn: handleExecute, onSuccess: (response) => setLastTask(response.task) });
  const error = start.error?.message || stop.error?.message || execute.error?.message || tasks.error?.message || liveView.error;
  const pending = start.isPending || stop.isPending || execute.isPending;
  const taskItems = useMemo(() => tasks.data?.tasks || [], [tasks.data?.tasks]);
  const summary = useMemo(() => summarizeTasks(taskItems), [taskItems]);

  useEffect(() => setLastTask(undefined), [sessionId]);

  function applyQuickTemplate() {
    setCommandsText(formatJSON(buildQuickCommands(quickCommand)));
  }

  function updateQuickCommand(patch: Partial<QuickCommandOptions>) {
    const next = { ...quickCommand, ...patch };
    setQuickCommand(next);
    setCommandsText(formatJSON(buildQuickCommands(next)));
  }

  async function handleStart() {
    return startSession({
      profile: {
        browser_kind: browserKind,
        locale,
        timezone,
        proxy_ref: proxyRef.trim(),
        user_agent: '',
        viewport: undefined,
        storage_state_secret_ref: undefined,
        extra_http_headers: {},
        init_scripts: []
      },
      request_id: newRequestId('session'),
      ttl: '1800s',
      security_policy: undefined,
      labels: { source: 'standalone-webui' }
    });
  }

  async function handleExecute() {
    if (!sessionId) {
      throw new Error('请先启动浏览器会话');
    }
    const commands = parseCommands(commandsText);
    const response = await executeCommands({
      request_id: newRequestId('task'),
      input: {
        session_id: sessionId,
        task_key: 'webui.quick.commands',
        scenario_key: '',
        target_url: quickCommand.targetUrl.trim(),
        timeout: '90s',
        commands,
        security_policy: undefined,
        labels: { source: 'standalone-webui' }
      }
    });
    await tasks.refetch();
    return response;
  }

  return (
    <main>
      <PageHeader activeSessionId={sessionId} error={error} pending={pending} />
      <Status error={error} />
      <BrowserStage activeSessionId={sessionId} connected={liveView.connected} error={liveView.error} frame={liveView.frame} onInput={liveView.sendInput} pending={pending} targetUrl={quickCommand.targetUrl} task={lastTask} />
      <SummaryCard {...summary} />
      <div className="layout">
        <SessionCard
          browserKind={browserKind}
          locale={locale}
          onBrowserKindChange={setBrowserKind}
          onLocaleChange={setLocale}
          onProxyRefChange={setProxyRef}
          onStart={() => start.mutate()}
          onStop={() => stop.mutate()}
          onTimezoneChange={setTimezone}
          pending={pending}
          proxyRef={proxyRef}
          sessionId={sessionId}
          timezone={timezone}
        />
        <CommandCard
          captureScreenshot={quickCommand.captureScreenshot}
          commandsText={commandsText}
          includeHtml={quickCommand.includeHtml}
          includeText={quickCommand.includeText}
          onApplyTemplate={applyQuickTemplate}
          onCaptureScreenshotChange={(value) => updateQuickCommand({ captureScreenshot: value })}
          onChange={setCommandsText}
          onExecute={() => execute.mutate()}
          onIncludeHtmlChange={(value) => updateQuickCommand({ includeHtml: value })}
          onIncludeTextChange={(value) => updateQuickCommand({ includeText: value })}
          onTargetUrlChange={(value) => updateQuickCommand({ targetUrl: value })}
          onWaitUntilChange={(value) => updateQuickCommand({ waitUntil: value })}
          pending={pending}
          sessionId={sessionId}
          targetUrl={quickCommand.targetUrl}
          waitUntil={quickCommand.waitUntil}
        />
        <ResultCard task={lastTask} />
        <TaskList tasks={taskItems} />
      </div>
    </main>
  );
}

function parseCommands(value: string): BrowserCommand[] {
  try {
    const parsed = JSON.parse(value) as BrowserCommand[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('commands 必须是非空数组');
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`命令 JSON 解析失败：${message}`, { cause: error });
  }
}

function newRequestId(scope: string) {
  return `${scope}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`;
}

function summarizeTasks(tasks: BrowserTask[]) {
  return {
    failed: tasks.filter((task) => task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_FAILED || task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_TIMEOUT).length,
    running: tasks.filter((task) => task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_RUNNING || task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_QUEUED).length,
    succeeded: tasks.filter((task) => task.status === BrowserTaskStatus.BROWSER_TASK_STATUS_SUCCEEDED).length,
    total: tasks.length
  };
}
