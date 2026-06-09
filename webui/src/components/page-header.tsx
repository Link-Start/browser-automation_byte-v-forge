import { Badge, Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { safeMessage } from '../api/safe-json';

type PageHeaderProps = {
  activeSessionId?: string;
  description?: string;
  error?: string;
  pending: boolean;
  title: string;
};

export function PageHeader({ activeSessionId, description, error, pending, title }: PageHeaderProps) {
  return (
    <header className="hero">
      <Box className="hero-copy">
        <Heading as="h1" size="8">{title}</Heading>
        {description ? <Text as="p" color="gray" size="3">{description}</Text> : null}
      </Box>
      <Flex align="end" className="hero-state" direction="column" gap="2">
        {error || pending ? <HeaderState error={error} pending={pending} /> : null}
        {activeSessionId ? <Badge className="session-chip" color="gray" variant="soft">会话：{activeSessionId}</Badge> : null}
      </Flex>
    </header>
  );
}

function HeaderState({ error, pending }: { error?: string; pending: boolean }) {
  return (
    <Card className={error ? 'state-pill state-error' : 'state-pill'} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>
      {error ? <AlertTriangle size={16} /> : <Loader2 className="spin" size={16} />}
      <span>{error ? safeMessage(error) : pending ? '处理中' : ''}</span>
    </Card>
  );
}
