import { Link, Navigate, useParams } from 'react-router';
import { BrowserStage } from '../components/browser-stage';
import { PageHeader } from '../components/page-header';
import { Status } from '../components/status';
import { useLiveViewToken } from '../hooks/use-live-view';
import { paths } from './paths';

export function LiveViewRoute() {
  const { token = '' } = useParams();
  const liveView = useLiveViewToken(token);
  if (!token) {
    return <Navigate replace to={paths.sessions} />;
  }
  return (
    <main>
      <PageHeader activeSessionId="LiveView Token" error={liveView.error} pending={!liveView.connected && !liveView.error} />
      <Status error={liveView.error} message={liveView.connected ? 'LiveView 已连接，可直接操作远端浏览器。' : '正在连接 LiveView...'} />
      <BrowserStage
        activeSessionId="LiveView Token"
        connected={liveView.connected}
        error={liveView.error}
        frame={liveView.frame}
        onInput={liveView.sendInput}
        pending={!liveView.connected && !liveView.error}
        placeholderPreview="该页面由 /live/:token 路由直接进入，WebSocket 连接仍走可替换 LiveView 协议。"
        placeholderTitle="正在连接远端浏览器画面"
        targetUrl="about:blank"
      />
      <p className="route-back"><Link to={paths.sessions}>返回控制台</Link></p>
    </main>
  );
}
