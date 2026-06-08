import { Navigate } from 'react-router';
import { paths } from './paths';

export function SessionRedirectRoute() {
  return <Navigate replace to={paths.sessions} />;
}
