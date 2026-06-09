import { Card, Flex, Grid, IconButton, SegmentedControl, Select, Text, TextField, Tooltip } from '@radix-ui/themes';
import type { FormEvent } from 'react';
import { ArrowRight, Globe2, PlugZap, Sparkles } from 'lucide-react';
import { BrowserProxyProviderKind } from '../proto/browser/automation/v1/browser_automation';

type SelectOption = { label: string; value: string };

type CloudBrowserLauncherProps = {
  disabled: boolean;
  fingerprintMode: string;
  launchError?: string;
  launching: boolean;
  locale: string;
  localeOptions: SelectOption[];
  manualProxyUrl: string;
  onFingerprintModeChange: (value: string) => void;
  onLaunch: () => void;
  onLocaleChange: (value: string) => void;
  onManualProxyUrlChange: (value: string) => void;
  onProxyModeChange: (value: BrowserProxyProviderKind) => void;
  onProxyRuntimeAccountIdChange: (value: string) => void;
  onTargetUrlChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  proxyMode: BrowserProxyProviderKind;
  proxyRuntimeAccountId: string;
  targetUrl: string;
  timezone: string;
  timezoneOptions: SelectOption[];
  validationError: string;
};

export function CloudBrowserLauncher(props: CloudBrowserLauncherProps) {
  const feedback = props.validationError || props.launchError || '';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.disabled && !props.validationError) props.onLaunch();
  }

  return (
    <Card className="launch-card" aria-label="新建云浏览器窗口">
      <form className="launch-form" onSubmit={submit}>
        <Grid className="launch-address" gap="2">
          <label className="sr-only" htmlFor="cloud-browser-target">URL</label>
          <TextField.Root
            id="cloud-browser-target"
            aria-describedby={feedback ? 'cloud-browser-feedback' : undefined}
            aria-invalid={Boolean(feedback)}
            autoComplete="url"
            inputMode="url"
            onChange={(event) => props.onTargetUrlChange(event.target.value)}
            placeholder="搜索或输入网址"
            size="3"
            value={props.targetUrl}
          >
            <TextField.Slot><Globe2 size={17} /></TextField.Slot>
          </TextField.Root>
          <Tooltip content="打开">
            <IconButton aria-label="打开窗口" disabled={props.disabled || Boolean(props.validationError)} size="4" type="submit">
              {props.launching ? <Sparkles className="spin" size={18} /> : <ArrowRight size={18} />}
            </IconButton>
          </Tooltip>
        </Grid>
        <Flex align="center" className="launch-options" gap="2" wrap="wrap">
          <SegmentedControl.Root size="1" value={props.fingerprintMode} onValueChange={props.onFingerprintModeChange}>
            <SegmentedControl.Item value="ip">随 IP</SegmentedControl.Item>
            <SegmentedControl.Item value="manual">自定义</SegmentedControl.Item>
          </SegmentedControl.Root>
          <ProxyControls {...props} />
          {props.fingerprintMode === 'manual' ? <ManualFingerprintControls {...props} /> : null}
        </Flex>
        {feedback ? <Text as="p" id="cloud-browser-feedback" className="form-feedback form-feedback-error" role="alert">{feedback}</Text> : null}
      </form>
    </Card>
  );
}

type ProxyControlProps = Pick<CloudBrowserLauncherProps, 'manualProxyUrl' | 'onManualProxyUrlChange' | 'onProxyModeChange' | 'onProxyRuntimeAccountIdChange' | 'proxyMode' | 'proxyRuntimeAccountId'>;

function ProxyControls(props: ProxyControlProps) {
  const isManual = props.proxyMode === BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_MANUAL;
  const isRuntime = props.proxyMode === BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_PROXY_RUNTIME;
  return (
    <Flex align="center" className="proxy-controls" gap="2" wrap="wrap">
      <Select.Root value={props.proxyMode} onValueChange={(value) => props.onProxyModeChange(value as BrowserProxyProviderKind)}>
        <Select.Trigger aria-label="代理" className="proxy-select" />
        <Select.Content>
          <Select.Item value={BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_NONE}>直连</Select.Item>
          <Select.Item value={BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_MANUAL}>手动代理</Select.Item>
          <Select.Item value={BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_PROXY_RUNTIME}>代理服务</Select.Item>
        </Select.Content>
      </Select.Root>
      {isManual ? <ProxyInput value={props.manualProxyUrl} onChange={props.onManualProxyUrlChange} placeholder="host:port:user:pass" /> : null}
      {isRuntime ? <ProxyInput value={props.proxyRuntimeAccountId} onChange={props.onProxyRuntimeAccountIdChange} placeholder="配置 ID" /> : null}
    </Flex>
  );
}

function ProxyInput({ onChange, placeholder, value }: { onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <TextField.Root autoComplete="off" className="proxy-input" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value}>
      <TextField.Slot><PlugZap size={14} /></TextField.Slot>
    </TextField.Root>
  );
}

type ManualFingerprintProps = Pick<CloudBrowserLauncherProps, 'locale' | 'localeOptions' | 'onLocaleChange' | 'onTimezoneChange' | 'timezone' | 'timezoneOptions'>;

function ManualFingerprintControls(props: ManualFingerprintProps) {
  return (
    <Flex align="center" className="manual-fingerprint" gap="2" wrap="wrap">
      <Select.Root value={props.locale} onValueChange={props.onLocaleChange}>
        <Select.Trigger aria-label="语言" className="locale-select" />
        <Select.Content>{props.localeOptions.map((item) => <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>)}</Select.Content>
      </Select.Root>
      <Select.Root value={props.timezone} onValueChange={props.onTimezoneChange}>
        <Select.Trigger aria-label="时区" className="timezone-select" />
        <Select.Content>{props.timezoneOptions.map((item) => <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>)}</Select.Content>
      </Select.Root>
    </Flex>
  );
}
