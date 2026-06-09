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
import { buildStartSessionRequest, defaultSessionConfig, validateSessionConfig, type SessionConfig } from './session-config';
import { newRequestId } from './session-route-utils';
import '../workbench.css';

type FingerprintMode = 'ip' | 'manual';

type SelectOption = { label: string; value: string };

type LaunchResult = {
  sessionId: string;
  warning?: string;
};

const localeOptions: SelectOption[] = [
  { label: 'zh-CN', value: 'zh-CN' },
  { label: 'en-US', value: 'en-US' },
  { label: 'ja-JP', value: 'ja-JP' },
  { label: 'de-DE', value: 'de-DE' }
];

const timezoneOptions: SelectOption[] = [
  { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: 'America/New_York', value: 'America/New_York' },
  { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Berlin', value: 'Europe/Berlin' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'UTC', value: 'UTC' }
];

export function HomeRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState(defaultQuickCommand.targetUrl);
  const [launchWarning, setLaunchWarning] = useState('');
  const [fingerprintMode, setFingerprintMode] = useState<FingerprintMode>('ip');
  const [locale, setLocale] = useState('zh-CN');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const sessions = useQuery({ queryKey: browserQueryKeys.sessions, queryFn: listSessions, refetchInterval: 5000 });
  const sessionItems = sessions.data?.sessions || [];
  const recentSession = sessionItems[0];
  const sessionConfig = buildFingerprintConfig(fingerprintMode, locale, timezone);
  const validationError = validateLaunchTarget(targetUrl) || validateSessionConfig(sessionConfig);
  const launch = useMutation({ mutationFn: launchCloudBrowser, onSuccess: handleLaunchSuccess });

  async function launchCloudBrowser(): Promise<LaunchResult> {
    if (validationError) {
      throw new Error(validationError);
    }
    const normalizedUrl = normalizeLaunchTarget(targetUrl);
    const sessionResponse = await startSession(buildStartSessionRequest(sessionConfig, newRequestId('session')));
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
          fingerprintMode={fingerprintMode}
          launchError={launch.error?.message || sessions.error?.message || launchWarning}
          launching={launch.isPending}
          locale={locale}
          localeOptions={localeOptions}
          onFingerprintModeChange={(value) => setFingerprintMode(value as FingerprintMode)}
          onLaunch={() => launch.mutate()}
          onLocaleChange={setLocale}
          onTargetUrlChange={(value) => {
            setLaunchWarning('');
            setTargetUrl(value);
          }}
          onTimezoneChange={setTimezone}
          recentSession={recentSession}
          targetUrl={targetUrl}
          timezone={timezone}
          timezoneOptions={timezoneOptions}
          validationError={validationError}
          windowCount={sessionItems.length}
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

function buildFingerprintConfig(mode: FingerprintMode, locale: string, timezone: string): SessionConfig {
  if (mode === 'manual') {
    return { ...defaultSessionConfig, locale, timezone };
  }
  return { ...defaultSessionConfig, locale: '', timezone: '' };
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
