import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { executeCommands, listSessions, stopSession } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { safeURL } from '../api/safe-json';
import { BrowserStage } from '../components/browser-stage';
import { CloudSessionToolbar } from '../components/cloud-session-toolbar';
import { PageFrame } from '../components/page-frame';
import { SessionRail } from '../components/session-rail';
import { useLiveView } from '../hooks/use-live-view';
import { paths } from './paths';
import { normalizeBrowserUrl, validateBrowserUrl } from './browser-url';
import { buildSessionBrowserRequest, type SessionBrowserAction } from './session-browser-actions';
import { useSessionRoute } from './session-route-layout';
import '../workbench.css';
import '../session-live.css';

export function SessionLiveRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sessionId } = useSessionRoute();
  const liveView = useLiveView(sessionId);
  const [addressFocused, setAddressFocused] = useState(false);
  const [addressValue, setAddressValue] = useState('about:blank');
  const currentUrl = liveView.frame?.current_url || 'about:blank';
  const sessions = useQuery({ queryKey: browserQueryKeys.sessions, queryFn: listSessions, refetchInterval: 5000 });
  const browse = useMutation({ mutationFn: runBrowserAction });
  const stop = useMutation({ mutationFn: () => stopSession(sessionId, 'user stop'), onSuccess: handleStopped });
  const disabled = stop.isPending || Boolean(liveView.error);

  useEffect(() => {
    if (!addressFocused) {
      setAddressValue(safeURL(currentUrl));
    }
  }, [addressFocused, currentUrl]);

  async function handleStopped() {
    await queryClient.invalidateQueries({ queryKey: browserQueryKeys.sessions });
    navigate(paths.home);
  }

  async function runBrowserAction(action: SessionBrowserAction) {
    const targetUrl = action === 'navigate' ? normalizeBrowserUrl(addressValue) : currentUrl;
    const validationError = action === 'navigate' ? validateBrowserUrl(addressValue) : '';
    if (validationError) throw new Error(validationError);
    return executeCommands(buildSessionBrowserRequest(sessionId, action, targetUrl));
  }

  function mutateAction(action: SessionBrowserAction) {
    if (!disabled) {
      browse.mutate(action);
    }
  }

  return (
    <PageFrame className="cloud-session-page">
      <div className="cloud-session-workspace">
        <SessionRail
          activeSessionId={sessionId}
          onRefresh={() => {
            void sessions.refetch();
          }}
          refreshing={sessions.isFetching}
          sessions={sessions.data?.sessions || []}
        />
        <div className="cloud-session-main">
          <CloudSessionToolbar
            addressValue={addressValue}
            connected={liveView.connected}
            disabled={disabled || browse.isPending}
            error={liveView.error || browse.error?.message || stop.error?.message || sessions.error?.message}
            navigating={browse.isPending}
            onAddressChange={setAddressValue}
            onAddressFocusChange={setAddressFocused}
            onBack={() => mutateAction('back')}
            onForward={() => mutateAction('forward')}
            onNavigate={() => mutateAction('navigate')}
            onReload={() => mutateAction('reload')}
            onStop={() => stop.mutate()}
            reconnecting={liveView.reconnecting}
            stopping={stop.isPending}
          />
          <BrowserStage
            connected={liveView.connected}
            error={liveView.error || browse.error?.message || stop.error?.message}
            frame={liveView.frame}
            onInput={liveView.sendInput}
            pending={!liveView.connected && !liveView.error}
          />
        </div>
      </div>
    </PageFrame>
  );
}
