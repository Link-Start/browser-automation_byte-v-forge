import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { buildQuickCommands, defaultQuickCommand, formatJSON, type QuickCommandOptions } from '../api/defaults';
import { executeCommands } from '../api/browser-api';
import { CommandCard } from '../components/command-card';
import { PageHeader } from '../components/page-header';
import { ResultCard } from '../components/result-card';
import { Status } from '../components/status';
import type { BrowserCommand, BrowserTask, ExecuteBrowserCommandsRequest } from '../proto/browser/automation/v1/browser_automation';
import { validateBrowserCommands } from './command-validation';
import { paths } from './paths';
import { newRequestId } from './session-route-utils';
import { SessionTabs } from './session-tabs';

export function SessionCommandsRoute() {
  const { sessionId = '' } = useParams();
  const [quickCommand, setQuickCommand] = useState(defaultQuickCommand);
  const [commandsText, setCommandsText] = useState(formatJSON(buildQuickCommands(defaultQuickCommand)));
  const [lastTask, setLastTask] = useState<BrowserTask>();
  const commandValidation = validateBrowserCommands(commandsText);
  const execute = useMutation({ mutationFn: handleExecute, onSuccess: (response) => setLastTask(response.task) });
  if (!sessionId) return <Navigate replace to={paths.sessions} />;

  function updateQuickCommand(patch: Partial<QuickCommandOptions>) {
    const next = { ...quickCommand, ...patch };
    setQuickCommand(next);
    setCommandsText(formatJSON(buildQuickCommands(next)));
  }

  async function handleExecute() {
    if (commandValidation.error) {
      throw new Error(commandValidation.error);
    }
    return executeCommands(buildExecuteRequest(sessionId, quickCommand, commandValidation.commands));
  }

  return (
    <main>
      <PageHeader
        activeSessionId={sessionId}
        description="只负责为当前 session 生成并执行 Proto JSON 命令，结果在本页独立展示。"
        error={execute.error?.message}
        pending={execute.isPending}
        title="执行命令"
      />
      <SessionTabs sessionId={sessionId} />
      <Status error={execute.error?.message} message="这里只处理命令执行；实时画面请切到 Live 路由。" />
      <div className="layout">
        <CommandCard
          captureScreenshot={quickCommand.captureScreenshot}
          commandCount={commandValidation.commands.length}
          commandsText={commandsText}
          includeHtml={quickCommand.includeHtml}
          includeText={quickCommand.includeText}
          onApplyTemplate={() => setCommandsText(formatJSON(buildQuickCommands(quickCommand)))}
          onCaptureScreenshotChange={(value) => updateQuickCommand({ captureScreenshot: value })}
          onChange={setCommandsText}
          onExecute={() => execute.mutate()}
          onIncludeHtmlChange={(value) => updateQuickCommand({ includeHtml: value })}
          onIncludeTextChange={(value) => updateQuickCommand({ includeText: value })}
          onTargetUrlChange={(value) => updateQuickCommand({ targetUrl: value })}
          onWaitUntilChange={(value) => updateQuickCommand({ waitUntil: value })}
          pending={execute.isPending}
          sessionId={sessionId}
          targetUrl={quickCommand.targetUrl}
          validationError={commandValidation.error}
          waitUntil={quickCommand.waitUntil}
        />
        <ResultCard task={lastTask} />
      </div>
    </main>
  );
}

function buildExecuteRequest(sessionId: string, quickCommand: QuickCommandOptions, commands: BrowserCommand[]): ExecuteBrowserCommandsRequest {
  return {
    request_id: newRequestId('task'),
    input: {
      commands,
      labels: { source: 'standalone-webui' },
      scenario_key: '',
      security_policy: undefined,
      session_id: sessionId,
      target_url: quickCommand.targetUrl.trim(),
      task_key: 'webui.quick.commands',
      timeout: '90s'
    }
  };
}
