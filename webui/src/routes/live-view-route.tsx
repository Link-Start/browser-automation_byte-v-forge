import { Link, Navigate, useParams } from 'react-router';
import { BrowserStage } from '../components/browser-stage';
import { PageFrame } from '../components/page-frame';
import { PageHeader } from '../components/page-header';
import { Status } from '../components/status';
import { useLiveViewToken } from '../hooks/use-live-view';
import { paths } from './paths';

export function LiveViewRoute() {
  const { token = '' } = useParams();
  const liveView = useLiveViewToken(token);
  if (!token) {
    return <Navigate replace to={paths.home} />;
  }
  const pending = !liveView.connected && !liveView.error;
  const message = liveView.connected ? '已连接' : liveView.reconnecting ? '重连中' : '连接中';
  return (
    <PageFrame>
      <PageHeader
        activeSessionId="LiveView Token"
        error={liveView.error}
        pending={pending}
        title="独立 LiveView"
      />
      <Status error={liveView.error} message={message} />
      <BrowserStage
        activeSessionId="LiveView Token"
        connected={liveView.connected}
        error={liveView.error}
        frame={liveView.frame}
        onInput={liveView.sendInput}
        pending={pending}
        placeholderPreview="连接中"
        placeholderTitle="云浏览器"
        targetUrl="about:blank"
      />
      <p className="route-back"><Link to={paths.home}>返回入口</Link></p>
    </PageFrame>
  );
}
