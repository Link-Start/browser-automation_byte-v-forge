type StatusProps = {
  error?: string;
  message?: string;
};

export function Status({ error, message }: StatusProps) {
  if (!error && !message) {
    return null;
  }
  return <p className={error ? 'notice notice-error' : 'notice'}>{error || message}</p>;
}
