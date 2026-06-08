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
  const stop = useMutation({ mutationFn: () => stopSession(sessionId, 'webui stop'), onSuccess: () => navigate(paths.newSession) });
  const pending = !liveView.connected && !liveView.error;
  const message = liveView.connected ? 'LiveView 已连接。' : liveView.reconnecting ? 'LiveView 连接中断，正在自动重连。' : '正在连接远端浏览器画面。';
  return (
    <SessionPage
      description="专注展示 CDP LiveView 画面和输入回放，不混入命令表单与任务列表。"
      error={liveView.error || stop.error?.message}
      pending={pending || stop.isPending}
      sessionId={sessionId}
      statusMessage={message}
      title="实时浏览器"
    >
      <SessionToolbar connected={liveView.connected} liveViewUrl={liveView.view?.url} onStop={() => stop.mutate()} pending={stop.isPending} sessionId={sessionId} />
      <BrowserStage activeSessionId={sessionId} connected={liveView.connected} error={liveView.error} frame={liveView.frame} onInput={liveView.sendInput} pending={pending} targetUrl={liveView.view?.url || 'about:blank'} />
    </SessionPage>
  );
}
