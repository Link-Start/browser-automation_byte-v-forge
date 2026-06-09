import { Badge, Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { Activity, Cloud, Loader2 } from 'lucide-react';
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
        <Badge className="service-badge" color="orange" size="2" variant="soft">
          <Cloud size={16} />
          <span>Cloud Browser</span>
        </Badge>
        <Heading as="h1" size="9">{title}</Heading>
        {description ? <Text as="p" color="gray" size="3">{description}</Text> : null}
      </Box>
      <Flex align="end" className="hero-state" direction="column" gap="2">
        <Card className={error ? 'state-pill state-error' : 'state-pill'} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>
          {pending ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
          <span>{error ? safeMessage(error) : pending ? '请求处理中' : '服务可用'}</span>
        </Card>
        {activeSessionId ? <Badge className="session-chip" color="gray" variant="soft">当前会话：{activeSessionId}</Badge> : null}
      </Flex>
    </header>
  );
}
