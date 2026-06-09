import { Box, Button, Card, Checkbox, Flex, Grid, Select, Text, TextArea, TextField } from '@radix-ui/themes';
import type { FormEvent } from 'react';
import { Code2, PlayCircle, Wand2 } from 'lucide-react';
import type { BrowserNavigationWaitUntil } from '../proto/browser/automation/v1/browser_automation';
import { waitUntilLabel, waitUntilOptions } from '../api/defaults';

type CommandCardProps = {
  captureScreenshot: boolean;
  commandCount: number;
  commandsText: string;
  includeHtml: boolean;
  includeText: boolean;
  onApplyTemplate: () => void;
  onCaptureScreenshotChange: (value: boolean) => void;
  onChange: (value: string) => void;
  onExecute: () => void;
  onIncludeHtmlChange: (value: boolean) => void;
  onIncludeTextChange: (value: boolean) => void;
  onTargetUrlChange: (value: string) => void;
  onWaitUntilChange: (value: BrowserNavigationWaitUntil) => void;
  pending: boolean;
  sessionId: string;
  targetUrl: string;
  validationError: string;
  waitUntil: BrowserNavigationWaitUntil;
};

export function CommandCard(props: CommandCardProps) {
  const canExecute = !props.pending && Boolean(props.sessionId) && !props.validationError;

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canExecute) props.onExecute();
  }

  return (
    <Card className="card command-card">
      <form className="card-form" onSubmit={submitCommand}>
        <div className="card-title">
          <Box><Text as="p" size="5" weight="bold">命令</Text></Box>
          <Text as="span" color="gray" size="2">{props.commandCount}</Text>
        </div>
        <Grid className="form-grid command-builder" gap="3">
          <label className="wide" htmlFor="command-target-url">
            URL
            <TextField.Root
              id="command-target-url"
              autoComplete="url"
              inputMode="url"
              aria-describedby="command-validation-feedback"
              aria-invalid={Boolean(props.validationError)}
              value={props.targetUrl}
              onChange={(event) => props.onTargetUrlChange(event.target.value)}
              placeholder="https://example.com"
            />
          </label>
          <label htmlFor="command-wait-until">
            等待
            <Select.Root value={props.waitUntil} onValueChange={(value) => props.onWaitUntilChange(value as BrowserNavigationWaitUntil)}>
              <Select.Trigger id="command-wait-until" />
              <Select.Content>{waitUntilOptions.map((item) => <Select.Item key={item} value={item}>{waitUntilLabel(item)}</Select.Item>)}</Select.Content>
            </Select.Root>
          </label>
        </Grid>
        <Flex className="toggle-row" gap="2" wrap="wrap">
          <label><Checkbox checked={props.includeText} onCheckedChange={(checked) => props.onIncludeTextChange(checked === true)} />正文</label>
          <label><Checkbox checked={props.includeHtml} onCheckedChange={(checked) => props.onIncludeHtmlChange(checked === true)} />HTML</label>
          <label><Checkbox checked={props.captureScreenshot} onCheckedChange={(checked) => props.onCaptureScreenshotChange(checked === true)} />截图</label>
        </Flex>
        <Flex className="actions" gap="2" wrap="wrap">
          <Button onClick={props.onApplyTemplate} type="button" variant="soft"><Wand2 size={16} />生成</Button>
          <Button disabled={!canExecute} type="submit"><PlayCircle size={16} />执行</Button>
        </Flex>
        <Text as="p" id="command-validation-feedback" className={props.validationError ? 'json-feedback json-feedback-error' : 'json-feedback'} role={props.validationError ? 'alert' : 'status'} aria-live="polite">
          {props.validationError || '已校验'}
        </Text>
        <details className="json-editor">
          <summary><Code2 size={15} />JSON</summary>
          <TextArea spellCheck={false} value={props.commandsText} onChange={(event) => props.onChange(event.target.value)} aria-label="Browser commands JSON" />
        </details>
      </form>
    </Card>
  );
}
