import { Button } from '@radix-ui/themes';
import { Home } from 'lucide-react';
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
        pending={false}
        title="LiveView"
      />
      <Status error={liveView.error} message={message} />
      <BrowserStage
        connected={liveView.connected}
        error={liveView.error}
        frame={liveView.frame}
        onInput={liveView.sendInput}
        pending={pending}
      />
      <Button asChild className="live-back" size="2" variant="soft">
        <Link to={paths.home}><Home size={14} />入口</Link>
      </Button>
    </PageFrame>
  );
}
