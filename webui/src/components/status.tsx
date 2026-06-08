import { safeMessage } from '../api/safe-json';

type StatusProps = {
  error?: string;
  message?: string;
};

export function Status({ error, message }: StatusProps) {
  if (!error && !message) {
    return null;
  }
  return <p className={error ? 'notice notice-error' : 'notice'}>{error ? safeMessage(error) : message}</p>;
}
