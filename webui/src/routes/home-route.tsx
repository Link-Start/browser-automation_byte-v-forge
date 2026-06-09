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
import { buildStartSessionRequest, defaultSessionConfig, type SessionConfig } from './session-config';
import { newRequestId } from './session-route-utils';
import '../workbench.css';

type CloudBrowserPreset = {
  config: SessionConfig;
  description: string;
  id: string;
  label: string;
};

type LaunchResult = {
  sessionId: string;
  warning?: string;
};

const cloudBrowserPresets: CloudBrowserPreset[] = [
  { config: defaultSessionConfig, description: '默认', id: 'auto', label: '自动' },
  { config: { ...defaultSessionConfig, locale: 'en-US', timezone: 'America/New_York' }, description: 'en-US', id: 'us', label: '美国' },
  { config: { ...defaultSessionConfig, locale: 'ja-JP', timezone: 'Asia/Tokyo' }, description: 'ja-JP', id: 'jp', label: '日本' }
];

export function HomeRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState(defaultQuickCommand.targetUrl);
  const [launchWarning, setLaunchWarning] = useState('');
  const [presetId, setPresetId] = useState(cloudBrowserPresets[0].id);
  const sessions = useQuery({ queryKey: browserQueryKeys.sessions, queryFn: listSessions, refetchInterval: 5000 });
  const sessionItems = sessions.data?.sessions || [];
  const recentSession = sessionItems[0];
  const validationError = validateLaunchTarget(targetUrl);
  const selectedPreset = cloudBrowserPresets.find((preset) => preset.id === presetId) || cloudBrowserPresets[0];
  const launch = useMutation({ mutationFn: launchCloudBrowser, onSuccess: handleLaunchSuccess });

  async function launchCloudBrowser(): Promise<LaunchResult> {
    if (validationError) {
      throw new Error(validationError);
    }
    const normalizedUrl = normalizeLaunchTarget(targetUrl);
    const sessionResponse = await startSession(buildStartSessionRequest(selectedPreset.config, newRequestId('session')));
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
      <div className="cloud-workbench">
        <CloudBrowserLauncher
          disabled={launch.isPending}
          launchError={launch.error?.message || sessions.error?.message || launchWarning}
          launching={launch.isPending}
          onLaunch={() => launch.mutate()}
          onPresetChange={setPresetId}
          onTargetUrlChange={(value) => {
            setLaunchWarning('');
            setTargetUrl(value);
          }}
          presets={cloudBrowserPresets}
          recentSession={recentSession}
          selectedPresetId={presetId}
          targetUrl={targetUrl}
          validationError={validationError}
        />
        <SessionRail
          activeSessionId={recentSession?.session_id}
          lastUpdatedAt={sessions.dataUpdatedAt}
          onRefresh={() => {
            void sessions.refetch();
          }}
          refreshing={sessions.isFetching}
          sessions={sessionItems}
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
  if (!normalized) return '请输入网址。';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '仅支持 http/https。';
    }
    return '';
  } catch {
    return '网址无效。';
  }
}

function normalizeLaunchTarget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
