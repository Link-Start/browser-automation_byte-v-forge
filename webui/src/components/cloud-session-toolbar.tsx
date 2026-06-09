import { Badge, Button, Card, Flex, Grid, IconButton, Spinner, TextField, Tooltip } from '@radix-ui/themes';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Plus, RotateCw, Square } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '../routes/paths';

type CloudSessionToolbarProps = {
  addressValue: string;
  connected: boolean;
  disabled: boolean;
  error?: string;
  navigating: boolean;
  onAddressChange: (value: string) => void;
  onAddressFocusChange: (focused: boolean) => void;
  onBack: () => void;
  onForward: () => void;
  onNavigate: () => void;
  onReload: () => void;
  onStop: () => void;
  reconnecting: boolean;
  stopping: boolean;
};

export function CloudSessionToolbar(props: CloudSessionToolbarProps) {
  const status = sessionStatus(props);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.disabled && !props.navigating) props.onNavigate();
  }

  return (
    <Card className="cloud-session-toolbar" role="toolbar" aria-label="浏览器控制栏">
      <Flex align="center" gap="1" wrap="nowrap">
        <Tooltip content="新窗口">
          <IconButton asChild aria-label="新窗口" title="新窗口" variant="ghost">
            <Link to={paths.home}><Plus size={16} /></Link>
          </IconButton>
        </Tooltip>
        <Tooltip content="后退">
          <IconButton aria-label="后退" disabled={props.disabled} onClick={props.onBack} title="后退" type="button" variant="ghost"><ArrowLeft size={16} /></IconButton>
        </Tooltip>
        <Tooltip content="前进">
          <IconButton aria-label="前进" disabled={props.disabled} onClick={props.onForward} title="前进" type="button" variant="ghost"><ArrowRight size={16} /></IconButton>
        </Tooltip>
        <Tooltip content="刷新">
          <IconButton aria-label="刷新" disabled={props.disabled} onClick={props.onReload} title="刷新" type="button" variant="ghost"><RotateCw size={16} /></IconButton>
        </Tooltip>
      </Flex>
      <Grid asChild columns="minmax(0, 1fr) auto" gap="2">
        <form onSubmit={submit}>
          <TextField.Root
            aria-label="地址"
            disabled={props.stopping}
            onBlur={() => props.onAddressFocusChange(false)}
            onChange={(event) => props.onAddressChange(event.target.value)}
            onFocus={() => props.onAddressFocusChange(true)}
            placeholder="输入 URL"
            size="3"
            value={props.addressValue}
          />
          <Button aria-label="访问" disabled={props.disabled || props.navigating || props.stopping} size="3" type="submit" variant="solid">
            {props.navigating ? <Spinner size="2" /> : <ArrowRight size={16} />}
          </Button>
        </form>
      </Grid>
      <Flex align="center" gap="2" justify="end">
        <Badge aria-label={status.label} className="cloud-session-status" color={status.color} title={status.label} variant="soft" />
        <Tooltip content="停止窗口">
          <IconButton aria-label="停止窗口" color="red" disabled={props.stopping} onClick={props.onStop} title="停止窗口" type="button" variant="ghost">
            {props.stopping ? <Spinner size="2" /> : <Square size={16} />}
          </IconButton>
        </Tooltip>
      </Flex>
    </Card>
  );
}

function sessionStatus(props: Pick<CloudSessionToolbarProps, 'connected' | 'error' | 'navigating' | 'reconnecting' | 'stopping'>): { color: 'amber' | 'gray' | 'green' | 'red'; label: string } {
  if (props.error) return { color: 'red', label: '连接异常' };
  if (props.stopping) return { color: 'amber', label: '正在停止' };
  if (props.navigating) return { color: 'amber', label: '正在打开' };
  if (props.connected) return { color: 'green', label: '已连接' };
  if (props.reconnecting) return { color: 'amber', label: '重连中' };
  return { color: 'gray', label: '连接中' };
}
