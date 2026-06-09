import { Button, IconButton, TextField, Tooltip } from '@radix-ui/themes';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, RotateCw, Square } from 'lucide-react';
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
    if (!props.disabled && !props.navigating) {
      props.onNavigate();
    }
  }

  return (
    <section className="cloud-session-toolbar" aria-label="浏览器控制栏">
      <div className="cloud-session-nav">
        <ToolbarLink label="新窗口" to={paths.home}><Plus size={16} /></ToolbarLink>
        <ToolbarButton disabled={props.disabled} label="后退" onClick={props.onBack}><ArrowLeft size={16} /></ToolbarButton>
        <ToolbarButton disabled={props.disabled} label="前进" onClick={props.onForward}><ArrowRight size={16} /></ToolbarButton>
        <ToolbarButton disabled={props.disabled} label="刷新" onClick={props.onReload}><RotateCw size={16} /></ToolbarButton>
      </div>
      <form className="cloud-session-address" onSubmit={submit}>
        <TextField.Root
          aria-label="地址"
          className="cloud-session-address-input"
          disabled={props.stopping}
          onBlur={() => props.onAddressFocusChange(false)}
          onChange={(event) => props.onAddressChange(event.target.value)}
          onFocus={() => props.onAddressFocusChange(true)}
          placeholder="输入 URL"
          size="3"
          value={props.addressValue}
        />
        <Button aria-label="访问" disabled={props.disabled || props.navigating || props.stopping} size="3" type="submit" variant="solid">
          {props.navigating ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}
        </Button>
      </form>
      <div className="cloud-session-actions">
        <span className={`cloud-session-connection ${status.tone}`} title={status.label} aria-label={status.label} role="status" />
        <ToolbarButton danger disabled={props.stopping} label="停止窗口" onClick={props.onStop}>
          {props.stopping ? <Loader2 className="spin" size={16} /> : <Square size={16} />}
        </ToolbarButton>
      </div>
    </section>
  );
}

function ToolbarButton({ children, danger = false, disabled, label, onClick }: { children: ReactNode; danger?: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <Tooltip content={label}>
      <IconButton aria-label={label} color={danger ? 'red' : 'gray'} disabled={disabled} onClick={onClick} title={label} type="button" variant="ghost">
        {children}
      </IconButton>
    </Tooltip>
  );
}

function ToolbarLink({ children, label, to }: { children: ReactNode; label: string; to: string }) {
  return (
    <Tooltip content={label}>
      <IconButton asChild aria-label={label} title={label} variant="ghost">
        <Link to={to}>{children}</Link>
      </IconButton>
    </Tooltip>
  );
}

function sessionStatus(props: Pick<CloudSessionToolbarProps, 'connected' | 'error' | 'navigating' | 'reconnecting' | 'stopping'>) {
  if (props.error) return { label: '连接异常', tone: 'tone-danger' };
  if (props.stopping) return { label: '正在停止', tone: 'tone-warn' };
  if (props.navigating) return { label: '正在打开', tone: 'tone-warn' };
  if (props.connected) return { label: '已连接', tone: 'tone-success' };
  if (props.reconnecting) return { label: '重连中', tone: 'tone-warn' };
  return { label: '连接中', tone: 'tone-muted' };
}
