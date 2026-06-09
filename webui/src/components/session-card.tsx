import { Box, Button, Card, Flex, Grid, Select, Text, TextField } from '@radix-ui/themes';
import type { FormEvent } from 'react';
import { Play } from 'lucide-react';
import type { BrowserKind } from '../proto/browser/automation/v1/browser_automation';
import { browserKindLabel, browserKindOptions } from '../api/defaults';

type SessionCardProps = {
  browserKind: BrowserKind;
  locale: string;
  onBrowserKindChange: (value: BrowserKind) => void;
  onLocaleChange: (value: string) => void;
  onProxyRefChange: (value: string) => void;
  onStart: () => void;
  onTimezoneChange: (value: string) => void;
  pending: boolean;
  proxyRef: string;
  timezone: string;
  validationError: string;
};

export function SessionCard(props: SessionCardProps) {
  function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.pending && !props.validationError) {
      props.onStart();
    }
  }

  return (
    <Card className="card session-card">
      <form className="card-form" onSubmit={submitSession}>
      <div className="card-title">
        <Box>
          <p className="section-kicker">Simple Profile</p>
          <Text as="p" size="5" weight="bold">浏览器配置</Text>
        </Box>
        <Text as="span" color="gray" size="2">默认自动画像</Text>
      </div>
      <Grid className="form-grid" gap="3">
        <label htmlFor="browser-kind">
          浏览器内核
          <Select.Root value={props.browserKind} onValueChange={(value) => props.onBrowserKindChange(value as BrowserKind)}>
            <Select.Trigger id="browser-kind" />
            <Select.Content>
              {browserKindOptions.map((item) => (
                <Select.Item key={item} value={item}>{browserKindLabel(item)}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </label>
        <label htmlFor="proxy-ref">
          代理引用
          <TextField.Root id="proxy-ref" autoComplete="off" value={props.proxyRef} onChange={(event) => props.onProxyRefChange(event.target.value)} placeholder="可选，如 register" />
        </label>
      </Grid>
      <details className="json-editor">
        <summary>高级指纹参数<span className="summary-hint">一般不用改</span></summary>
        <Grid className="form-grid" gap="3">
        <label htmlFor="session-locale">
          Locale
          <TextField.Root id="session-locale" autoComplete="language" value={props.locale} onChange={(event) => props.onLocaleChange(event.target.value)} placeholder="en-US" />
        </label>
        <label htmlFor="session-timezone">
          Timezone
          <TextField.Root id="session-timezone" autoComplete="off" value={props.timezone} onChange={(event) => props.onTimezoneChange(event.target.value)} placeholder="America/New_York" />
        </label>
        </Grid>
      </details>
      <Flex className="actions" gap="2">
        <Button disabled={props.pending || Boolean(props.validationError)} type="submit">
          <Play size={16} />启动会话
        </Button>
      </Flex>
      {props.validationError ? (
        <Text as="p" className="form-feedback form-feedback-error" role="alert" aria-live="polite">
          {props.validationError}
        </Text>
      ) : null}
      </form>
    </Card>
  );
}
