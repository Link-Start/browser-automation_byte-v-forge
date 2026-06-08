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
  const message = liveView.connected ? 'LiveView 已连接，可直接操作远端浏览器。' : liveView.reconnecting ? 'LiveView 连接中断，正在自动重连。' : '正在连接 LiveView...';
  return (
    <PageFrame>
      <PageHeader
        activeSessionId="LiveView Token"
        description="通过 /live/:token 独立打开远端浏览器画面，便于嵌入或分享临时控制页。"
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
        placeholderPreview="该页面由 /live/:token 路由直接进入，WebSocket 连接仍走可替换 LiveView 协议。"
        placeholderTitle="正在连接远端浏览器画面"
        targetUrl="about:blank"
      />
      <p className="route-back"><Link to={paths.home}>返回入口</Link></p>
    </PageFrame>
  );
}
