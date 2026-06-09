import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flex, Grid } from '@radix-ui/themes';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { buildQuickCommands, defaultQuickCommand } from '../api/defaults';
import { executeCommands, listSessions, startSession } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { CloudBrowserLauncher } from '../components/cloud-browser-launcher';
import { CloudBrowserPanel } from '../components/cloud-browser-panel';
import { PageFrame } from '../components/page-frame';
import { SessionRail } from '../components/session-rail';
import {
  BrowserProxyProviderKind,
  type BrowserCommand,
  type ExecuteBrowserCommandsRequest
} from '../proto/browser/automation/v1/browser_automation';
import { paths } from './paths';
import { normalizeBrowserUrl, validateBrowserUrl } from './browser-url';
import { initialLocale, initialTimezone, localeOptions, timezoneOptions } from './fingerprint-options';
import { buildStartSessionRequest, defaultSessionConfig, validateSessionConfig, type SessionConfig } from './session-config';
import { newRequestId } from './request-id';
import '../workbench.css';

type FingerprintMode = 'ip' | 'manual';

type LaunchResult = {
  sessionId: string;
  warning?: string;
};

const localeOptionItems = localeOptions();
const timezoneOptionItems = timezoneOptions();

export function HomeRoute() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId = '' } = useParams();
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState(defaultQuickCommand.targetUrl);
  const [launchWarning, setLaunchWarning] = useState('');
  const [fingerprintMode, setFingerprintMode] = useState<FingerprintMode>('ip');
  const [locale, setLocale] = useState(initialLocale);
  const [manualProxyUrl, setManualProxyUrl] = useState('');
  const [proxyMode, setProxyMode] = useState(BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_NONE);
  const [proxyRuntimeAccountId, setProxyRuntimeAccountId] = useState('');
  const [timezone, setTimezone] = useState(initialTimezone);
  const sessions = useQuery({ queryKey: browserQueryKeys.sessions, queryFn: listSessions, refetchInterval: 5000 });
  const sessionItems = sessions.data?.sessions || [];
  const activeSessionId = routeSessionId.trim();
  const sessionConfig = buildCloudBrowserConfig(
    fingerprintMode,
    locale,
    timezone,
    proxyMode,
    manualProxyUrl,
    proxyRuntimeAccountId
  );
  const validationError = validateBrowserUrl(targetUrl) || validateSessionConfig(sessionConfig);
  const launch = useMutation({ mutationFn: launchCloudBrowser, onSuccess: handleLaunchSuccess });

  async function launchCloudBrowser(): Promise<LaunchResult> {
    if (validationError) {
      throw new Error(validationError);
    }
    const normalizedUrl = normalizeBrowserUrl(targetUrl);
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
    navigate(paths.session(result.sessionId));
  }

  return (
    <PageFrame className="cloud-workbench-page">
      <Grid className={activeSessionId ? 'cloud-workbench cloud-workbench-active' : 'cloud-workbench'} gap="3">
        <Flex className="cloud-workbench-main" direction="column" gap="2">
          <CloudBrowserLauncher
            disabled={launch.isPending}
            fingerprintMode={fingerprintMode}
            launchError={launch.error?.message || sessions.error?.message || launchWarning}
            launching={launch.isPending}
            locale={locale}
            localeOptions={localeOptionItems}
            manualProxyUrl={manualProxyUrl}
            onFingerprintModeChange={(value) => setFingerprintMode(value as FingerprintMode)}
            onLaunch={() => launch.mutate()}
            onLocaleChange={setLocale}
            onManualProxyUrlChange={setManualProxyUrl}
            onProxyModeChange={setProxyMode}
            onProxyRuntimeAccountIdChange={setProxyRuntimeAccountId}
            onTargetUrlChange={(value) => {
              setLaunchWarning('');
              setTargetUrl(value);
            }}
            onTimezoneChange={setTimezone}
            proxyMode={proxyMode}
            proxyRuntimeAccountId={proxyRuntimeAccountId}
            targetUrl={targetUrl}
            timezone={timezone}
            timezoneOptions={timezoneOptionItems}
            validationError={validationError}
          />
          {activeSessionId ? (
            <CloudBrowserPanel
              onStopped={() => navigate(paths.home)}
              sessionError={sessions.error?.message}
              sessionId={activeSessionId}
            />
          ) : null}
        </Flex>
        <SessionRail
          activeSessionId={activeSessionId}
          onRefresh={() => {
            void sessions.refetch();
          }}
          refreshing={sessions.isFetching}
          sessions={sessionItems}
        />
      </Grid>
    </PageFrame>
  );
}

function buildCloudBrowserConfig(
  mode: FingerprintMode,
  locale: string,
  timezone: string,
  proxyMode: BrowserProxyProviderKind,
  manualProxyUrl: string,
  proxyRuntimeAccountId: string
): SessionConfig {
  return {
    ...defaultSessionConfig,
    locale: mode === 'manual' ? locale : '',
    manualProxyUrl,
    proxyProviderKind: proxyMode,
    proxyRuntimeAccountId,
    timezone: mode === 'manual' ? timezone : ''
  };
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
