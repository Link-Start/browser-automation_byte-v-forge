import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { startSession } from '../api/browser-api';
import { PageHeader } from '../components/page-header';
import { SessionCard } from '../components/session-card';
import { Status } from '../components/status';
import { BrowserKind } from '../proto/browser/automation/v1/browser_automation';
import { paths } from './paths';
import { newRequestId } from './session-route-utils';

export function NewSessionRoute() {
  const navigate = useNavigate();
  const [browserKind, setBrowserKind] = useState<BrowserKind>(BrowserKind.BROWSER_KIND_CHROMIUM);
  const [locale, setLocale] = useState('en-US');
  const [proxyRef, setProxyRef] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const start = useMutation({ mutationFn: handleStart, onSuccess: (response) => response.session?.session_id && navigate(paths.sessionLive(response.session.session_id)) });

  async function handleStart() {
    return startSession({
      profile: { browser_kind: browserKind, locale, timezone, proxy_ref: proxyRef.trim(), user_agent: '', viewport: undefined, storage_state_secret_ref: undefined, extra_http_headers: {}, init_scripts: [] },
      request_id: newRequestId('session'),
      ttl: '1800s',
      security_policy: undefined,
      labels: { source: 'standalone-webui' }
    });
  }

  return (
    <main>
      <PageHeader activeSessionId="新会话" error={start.error?.message} pending={start.isPending} />
      <Status error={start.error?.message} message="服务端会根据 Pod 内存限制控制最大浏览器并发。" />
      <div className="single-column">
        <SessionCard browserKind={browserKind} locale={locale} onBrowserKindChange={setBrowserKind} onLocaleChange={setLocale} onProxyRefChange={setProxyRef} onStart={() => start.mutate()} onStop={() => undefined} onTimezoneChange={setTimezone} pending={start.isPending} proxyRef={proxyRef} sessionId="" timezone={timezone} />
      </div>
    </main>
  );
}
