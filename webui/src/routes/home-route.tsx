import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { buildQuickCommands, defaultQuickCommand } from '../api/defaults';
import { executeCommands, listSessions, startSession } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { CloudBrowserLauncher } from '../components/cloud-browser-launcher';
import { PageFrame } from '../components/page-frame';
import { SessionRail } from '../components/session-rail';
import type { BrowserCommand, ExecuteBrowserCommandsRequest } from '../proto/browser/automation/v1/browser_automation';
import { paths } from './paths';
import { buildStartSessionRequest, defaultSessionConfig } from './session-config';
import { newRequestId } from './session-route-utils';
import '../workbench.css';

type LaunchResult = {
  sessionId: string;
  warning?: string;
};

export function HomeRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState(defaultQuickCommand.targetUrl);
  const [launchWarning, setLaunchWarning] = useState('');
  const sessions = useQuery({ queryKey: browserQueryKeys.sessions, queryFn: listSessions, refetchInterval: 5000 });
  const sessionItems = sessions.data?.sessions || [];
  const recentSession = sessionItems[0];
  const validationError = validateLaunchTarget(targetUrl);
  const launch = useMutation({ mutationFn: launchCloudBrowser, onSuccess: handleLaunchSuccess });

  async function launchCloudBrowser(): Promise<LaunchResult> {
    if (validationError) {
      throw new Error(validationError);
    }
    const normalizedUrl = normalizeLaunchTarget(targetUrl);
    const sessionResponse = await startSession(buildStartSessionRequest(defaultSessionConfig, newRequestId('session')));
    const sessionId = sessionResponse.session?.session_id;
    if (!sessionId) {
      throw new Error('浏览器会话启动失败，请稍后重试。');
    }
    try {
      await executeCommands(buildLaunchRequest(sessionId, normalizedUrl));
      return { sessionId };
    } catch (error) {
      return { sessionId, warning: error instanceof Error ? error.message : '页面导航失败，已进入空白浏览器。' };
    }
  }

  async function handleLaunchSuccess(result: LaunchResult) {
    setLaunchWarning(result.warning || '');
    await queryClient.invalidateQueries({ queryKey: browserQueryKeys.sessions });
    navigate(paths.sessionLive(result.sessionId));
  }

  return (
    <PageFrame className="cloud-workbench-page">
      <div className="cloud-workbench-header">
        <p className="section-kicker">Cloud Browser</p>
        <h1>远端隔离浏览器</h1>
        <p>首页直接给用户浏览器入口和会话列表，不再让用户先理解后台流程或手动记 session。</p>
      </div>
      <div className="cloud-workbench">
        <SessionRail
          activeSessionId={recentSession?.session_id}
          lastUpdatedAt={sessions.dataUpdatedAt}
          onRefresh={() => {
            void sessions.refetch();
          }}
          refreshing={sessions.isFetching}
          sessions={sessionItems}
        />
        <CloudBrowserLauncher
          disabled={launch.isPending}
          launchError={launch.error?.message || sessions.error?.message || launchWarning}
          launching={launch.isPending}
          onLaunch={() => launch.mutate()}
          onTargetUrlChange={(value) => {
            setLaunchWarning('');
            setTargetUrl(value);
          }}
          recentSession={recentSession}
          sessionCount={sessionItems.length}
          targetUrl={targetUrl}
          validationError={validationError}
        />
      </div>
    </PageFrame>
  );
}

function buildLaunchRequest(sessionId: string, targetUrl: string): ExecuteBrowserCommandsRequest {
  const commands = launchCommands(targetUrl);
  return {
    request_id: newRequestId('task'),
    input: {
      commands,
      labels: { source: 'standalone-webui' },
      scenario_key: '',
      security_policy: undefined,
      session_id: sessionId,
      target_url: targetUrl,
      task_key: 'webui.cloud_browser.launch',
      timeout: '90s'
    }
  };
}

function launchCommands(targetUrl: string): BrowserCommand[] {
  return buildQuickCommands({
    ...defaultQuickCommand,
    includeHtml: false,
    includeText: false,
    targetUrl,
    waitUntil: defaultQuickCommand.waitUntil
  });
}

function validateLaunchTarget(value: string) {
  const normalized = normalizeLaunchTarget(value);
  if (!normalized) return '请输入要打开的网址。';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '仅支持 http 或 https 地址。';
    }
    return '';
  } catch {
    return '请输入有效网址，例如 https://example.com。';
  }
}

function normalizeLaunchTarget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
