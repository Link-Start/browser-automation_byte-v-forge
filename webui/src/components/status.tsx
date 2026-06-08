import { safeMessage } from '../api/safe-json';

type StatusProps = {
  error?: string;
  message?: string;
};

export function Status({ error, message }: StatusProps) {
  if (!error && !message) {
    return null;
  }
  return <p className={error ? 'notice notice-error' : 'notice'} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>{error ? safeMessage(error) : message}</p>;
}
