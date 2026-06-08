import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { startSession } from '../api/browser-api';
import { PageFrame } from '../components/page-frame';
import { PageHeader } from '../components/page-header';
import { SessionCard } from '../components/session-card';
import { Status } from '../components/status';
import { paths } from './paths';
import { buildStartSessionRequest, defaultSessionConfig, type SessionConfig, validateSessionConfig } from './session-config';
import { newRequestId } from './session-route-utils';

export function NewSessionRoute() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(defaultSessionConfig);
  const validationError = validateSessionConfig(config);
  const start = useMutation({ mutationFn: handleStart, onSuccess: (response) => response.session?.session_id && navigate(paths.sessionLive(response.session.session_id)) });

  async function handleStart() {
    if (validationError) {
      throw new Error(validationError);
    }
    return startSession(buildStartSessionRequest(config, newRequestId('session')));
  }

  function updateConfig(patch: Partial<SessionConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
  }

  return (
    <PageFrame>
      <PageHeader
        activeSessionId="新会话"
        description="只处理会话配置和启动，成功后进入实时浏览器子路由。"
        error={start.error?.message}
        pending={start.isPending}
        title="新建会话"
      />
      <Status error={start.error?.message} message="服务端会根据 Pod 内存限制控制最大浏览器并发。" />
      <div className="single-column">
        <SessionCard
          browserKind={config.browserKind}
          locale={config.locale}
          onBrowserKindChange={(browserKind) => updateConfig({ browserKind })}
          onLocaleChange={(locale) => updateConfig({ locale })}
          onProxyRefChange={(proxyRef) => updateConfig({ proxyRef })}
          onStart={() => start.mutate()}
          onTimezoneChange={(timezone) => updateConfig({ timezone })}
          pending={start.isPending}
          proxyRef={config.proxyRef}
          timezone={config.timezone}
          validationError={validationError}
        />
      </div>
    </PageFrame>
  );
}
