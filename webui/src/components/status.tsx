import { Callout } from '@radix-ui/themes';
import { AlertTriangle, Info } from 'lucide-react';
import { safeMessage } from '../api/safe-json';

type StatusProps = {
  error?: string;
  message?: string;
};

export function Status({ error, message }: StatusProps) {
  if (!error && !message) {
    return null;
  }
  return (
    <Callout.Root
      className={error ? 'notice notice-error' : 'notice'}
      color={error ? 'red' : 'orange'}
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
      variant="soft"
    >
      <Callout.Icon>{error ? <AlertTriangle size={16} /> : <Info size={16} />}</Callout.Icon>
      <Callout.Text>{error ? safeMessage(error) : message}</Callout.Text>
    </Callout.Root>
  );
}
