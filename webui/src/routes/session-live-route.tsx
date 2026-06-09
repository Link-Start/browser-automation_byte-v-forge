import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { stopSession } from '../api/browser-api';
import { BrowserStage } from '../components/browser-stage';
import { SessionToolbar } from '../components/session-toolbar';
import { useLiveView } from '../hooks/use-live-view';
import { paths } from './paths';
import { SessionPage } from './session-page';
import { useSessionRoute } from './session-route-layout';

export function SessionLiveRoute() {
  const navigate = useNavigate();
  const { sessionId } = useSessionRoute();
  const liveView = useLiveView(sessionId);
  const stop = useMutation({ mutationFn: () => stopSession(sessionId, 'webui stop'), onSuccess: () => navigate(paths.home) });
  const pending = !liveView.connected && !liveView.error;
  const message = liveView.connected ? '已连接' : liveView.reconnecting ? '重连中' : '连接中';
  return (
    <SessionPage
      error={liveView.error || stop.error?.message}
      pending={pending || stop.isPending}
      sessionId={sessionId}
      statusMessage={message}
      title="云浏览器"
    >
      <SessionToolbar connected={liveView.connected} liveViewUrl={liveView.view?.url} onStop={() => stop.mutate()} pending={stop.isPending} sessionId={sessionId} />
      <BrowserStage activeSessionId={sessionId} connected={liveView.connected} error={liveView.error} frame={liveView.frame} onInput={liveView.sendInput} pending={pending} targetUrl={liveView.view?.url || 'about:blank'} />
    </SessionPage>
  );
}
