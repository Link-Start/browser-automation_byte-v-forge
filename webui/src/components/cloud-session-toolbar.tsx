import { Badge, Card, Flex, Grid, IconButton, Spinner, TextField, Tooltip } from '@radix-ui/themes';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Globe2, Plus, RotateCw, X } from 'lucide-react';
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
      <Flex align="center" className="cloud-session-nav" gap="1" wrap="nowrap">
        <ToolbarButton label="后退" disabled={props.disabled} onClick={props.onBack}><ArrowLeft size={16} /></ToolbarButton>
        <ToolbarButton label="前进" disabled={props.disabled} onClick={props.onForward}><ArrowRight size={16} /></ToolbarButton>
        <ToolbarButton label="刷新" disabled={props.disabled} onClick={props.onReload}><RotateCw size={16} /></ToolbarButton>
      </Flex>
      <Grid asChild className="cloud-session-address-form" columns="minmax(0, 1fr) auto" gap="2">
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
          >
            <TextField.Slot><Globe2 size={15} /></TextField.Slot>
          </TextField.Root>
          <Tooltip content="访问">
            <IconButton aria-label="访问" disabled={props.disabled || props.navigating || props.stopping} size="3" type="submit" variant="solid">
              {props.navigating ? <Spinner size="2" /> : <ArrowRight size={16} />}
            </IconButton>
          </Tooltip>
        </form>
      </Grid>
      <Flex align="center" className="cloud-session-window-actions" gap="1" justify="end">
        <Badge aria-label={status.label} className="cloud-session-status" color={status.color} variant="soft" />
        <Tooltip content="新窗口">
          <IconButton asChild aria-label="新窗口" variant="ghost">
            <Link to={paths.home}><Plus size={16} /></Link>
          </IconButton>
        </Tooltip>
        <Tooltip content="关闭窗口">
          <IconButton aria-label="关闭窗口" color="red" disabled={props.stopping} onClick={props.onStop} type="button" variant="ghost">
            {props.stopping ? <Spinner size="2" /> : <X size={16} />}
          </IconButton>
        </Tooltip>
      </Flex>
    </Card>
  );
}

function ToolbarButton({ children, disabled, label, onClick }: { children: ReactNode; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <Tooltip content={label}>
      <IconButton aria-label={label} disabled={disabled} onClick={onClick} type="button" variant="ghost">
        {children}
      </IconButton>
    </Tooltip>
  );
}

function sessionStatus(props: Pick<CloudSessionToolbarProps, 'connected' | 'error' | 'navigating' | 'reconnecting' | 'stopping'>): { color: 'amber' | 'gray' | 'green' | 'red'; label: string } {
  if (props.error) return { color: 'red', label: '连接异常' };
  if (props.stopping) return { color: 'amber', label: '正在关闭' };
  if (props.navigating) return { color: 'amber', label: '正在打开' };
  if (props.connected) return { color: 'green', label: '已连接' };
  if (props.reconnecting) return { color: 'amber', label: '重连中' };
  return { color: 'gray', label: '连接中' };
}
