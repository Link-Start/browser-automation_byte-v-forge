import { Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
};

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <Card className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <Box>
        <Heading as="h3" size="3">{title}</Heading>
        <Text as="p" color="gray">{description}</Text>
      </Box>
      {action ? <Flex className="empty-state-action" justify="center">{action}</Flex> : null}
    </Card>
  );
}
