import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { buildQuickCommands, defaultQuickCommand, formatJSON, type QuickCommandOptions } from '../api/defaults';
import { executeCommands } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { CommandCard } from '../components/command-card';
import { ResultCard } from '../components/result-card';
import type { BrowserCommand, BrowserTask, ExecuteBrowserCommandsRequest } from '../proto/browser/automation/v1/browser_automation';
import { validateBrowserCommands } from './command-validation';
import { paths } from './paths';
import { SessionPage } from './session-page';
import { useSessionRoute } from './session-route-layout';
import { newRequestId } from './session-route-utils';

export function SessionCommandsRoute() {
  const { sessionId } = useSessionRoute();
  const queryClient = useQueryClient();
  const [quickCommand, setQuickCommand] = useState(defaultQuickCommand);
  const [commandsText, setCommandsText] = useState(formatJSON(buildQuickCommands(defaultQuickCommand)));
  const [lastTask, setLastTask] = useState<BrowserTask>();
  const commandValidation = validateBrowserCommands(commandsText);
  const execute = useMutation({
    mutationFn: handleExecute,
    onSuccess: async (response) => {
      setLastTask(response.task);
      await queryClient.invalidateQueries({ queryKey: browserQueryKeys.tasks(sessionId) });
    }
  });

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
    <SessionPage
      description="只负责为当前 session 生成并执行 Proto JSON 命令，结果在本页独立展示。"
      error={execute.error?.message}
      pending={execute.isPending}
      sessionId={sessionId}
      statusMessage="这里只处理命令执行；实时画面请切到 Live 路由。"
      title="执行命令"
    >
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
        <ResultCard task={lastTask} taskHistoryPath={paths.sessionTasks(sessionId)} />
      </div>
    </SessionPage>
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
      target_url: taskTargetURL(quickCommand, commands),
      task_key: 'webui.quick.commands',
      timeout: '90s'
    }
  };
}

function taskTargetURL(quickCommand: QuickCommandOptions, commands: BrowserCommand[]) {
  const navigateURL = commands.find((command) => command.navigate?.url)?.navigate?.url?.trim();
  return navigateURL || quickCommand.targetUrl.trim();
}
