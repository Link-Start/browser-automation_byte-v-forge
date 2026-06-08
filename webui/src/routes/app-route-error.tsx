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
        <p className="section-kicker">Route Error</p>
        <h1>页面暂时不可用</h1>
        <p className="muted">浏览器控制台遇到一个未预期错误。可以刷新当前页面，或回到入口重新选择路径。</p>
        <p className="error-box">{routeErrorMessage(error)}</p>
        <div className="actions">
          <button className="primary" onClick={() => window.location.reload()} type="button">
            <RotateCcw size={16} />刷新页面
          </button>
          <Link className="secondary link-button" to={paths.home}>
            <Home size={16} />回到入口
          </Link>
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
