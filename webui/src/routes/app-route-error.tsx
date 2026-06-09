import { Button } from '@radix-ui/themes';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Link, useRouteError } from 'react-router';
import { safeMessage } from '../api/safe-json';
import { PageFrame } from '../components/page-frame';
import { paths } from './paths';

export function AppRouteError() {
  const error = useRouteError();
  return (
    <PageFrame className="error-page" role="alert">
      <section className="card error-panel">
        <span className="error-icon"><AlertTriangle size={22} /></span>
        <h1>页面不可用</h1>
        <p className="error-box">{routeErrorMessage(error)}</p>
        <div className="actions">
          <Button onClick={() => window.location.reload()} type="button">
            <RotateCcw size={16} />刷新页面
          </Button>
          <Button asChild variant="soft">
            <Link to={paths.home}><Home size={16} />回到入口</Link>
          </Button>
        </div>
      </section>
    </PageFrame>
  );
}

function routeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return safeMessage(error.message);
  }
  if (isRouteError(error)) {
    return error.statusText ? safeMessage(error.statusText) : `请求失败：${error.status}`;
  }
  return '未知错误，请刷新页面后重试。';
}

function isRouteError(error: unknown): error is { status: number; statusText?: string } {
  return Boolean(error && typeof error === 'object' && 'status' in error);
}
