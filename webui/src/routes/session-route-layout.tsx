import { Navigate, Outlet, useOutletContext, useParams } from 'react-router';
import { paths } from './paths';

type SessionRouteContext = {
  sessionId: string;
};

export function SessionRouteLayout() {
  const { sessionId = '' } = useParams();
  if (!sessionId.trim()) {
    return <Navigate replace to={paths.home} />;
  }
  return <Outlet context={{ sessionId }} />;
}

export function useSessionRoute() {
  return useOutletContext<SessionRouteContext>();
}
