import { Badge, Button, Card, Flex, SegmentedControl, Select, Text, TextField } from '@radix-ui/themes';
import type { FormEvent } from 'react';
import { ArrowRight, Cloud, ExternalLink, LockKeyhole, Play, PlugZap, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { browserKindLabel, sessionStatusLabel } from '../api/defaults';
import { BrowserKind, BrowserProxyProviderKind, type BrowserSession } from '../proto/browser/automation/v1/browser_automation';
import { paths } from '../routes/paths';

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
  recentSession?: BrowserSession;
  targetUrl: string;
  timezone: string;
  timezoneOptions: SelectOption[];
  validationError: string;
  windowCount: number;
};

export function CloudBrowserLauncher(props: CloudBrowserLauncherProps) {
  const feedback = props.validationError || props.launchError || 'Ready';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.disabled && !props.validationError) props.onLaunch();
  }

  return (
    <section className="cloud-browser-card" aria-label="云浏览器">
      <Card className="cloud-browser-shell">
        <form className="cloud-browser-form" onSubmit={submit}>
          <div className="cloud-browser-topbar">
            <div className="window-dots"><span /><span /><span /></div>
            <div className="browser-tab"><Cloud size={14} />Cloud Browser</div>
            <Badge className="stage-status" color="green" variant="soft"><ShieldCheck size={12} />{props.windowCount} 窗口</Badge>
          </div>
          <div className="cloud-address-bar">
            <label className="sr-only" htmlFor="cloud-browser-target">目标网址</label>
            <TextField.Root
              className="cloud-address-input"
              id="cloud-browser-target"
              aria-describedby="cloud-browser-feedback"
              aria-invalid={Boolean(props.validationError || props.launchError)}
              autoComplete="url"
              inputMode="url"
              onChange={(event) => props.onTargetUrlChange(event.target.value)}
              placeholder="输入网址"
              value={props.targetUrl}
            >
              <TextField.Slot><LockKeyhole size={15} /></TextField.Slot>
            </TextField.Root>
            <Button disabled={props.disabled || Boolean(props.validationError)} type="submit">
              {props.launching ? <Sparkles className="spin" size={16} /> : <Play size={16} />}打开新窗口
            </Button>
          </div>
          <Flex align="center" className="cloud-profile-row" gap="3" justify="between" wrap="wrap">
            <Flex align="center" className="fingerprint-controls" gap="2" wrap="wrap">
              <SegmentedControl.Root value={props.fingerprintMode} onValueChange={props.onFingerprintModeChange}>
                <SegmentedControl.Item value="ip">基于 IP</SegmentedControl.Item>
                <SegmentedControl.Item value="manual">手动</SegmentedControl.Item>
              </SegmentedControl.Root>
              {props.fingerprintMode === 'manual' ? <ManualFingerprintControls {...props} /> : null}
            </Flex>
            <Flex align="center" gap="2" wrap="wrap">
              <ProxyControls {...props} />
              {props.recentSession ? <RecentSessionAction session={props.recentSession} /> : null}
            </Flex>
          </Flex>
          <Text
            as="p"
            id="cloud-browser-feedback"
            className={props.validationError || props.launchError ? 'form-feedback form-feedback-error' : 'form-feedback'}
            role={props.validationError || props.launchError ? 'alert' : 'status'}
            aria-live="polite"
          >
            {feedback}
          </Text>
          <div className="cloud-browser-blank">
            <div className="cloud-browser-center">
              <Cloud size={30} />
              <Text as="p" size="2" weight="medium">输入网址后打开</Text>
            </div>
          </div>
        </form>
      </Card>
    </section>
  );
}

type ProxyControlProps = Pick<
  CloudBrowserLauncherProps,
  | 'manualProxyUrl'
  | 'onManualProxyUrlChange'
  | 'onProxyModeChange'
  | 'onProxyRuntimeAccountIdChange'
  | 'proxyMode'
  | 'proxyRuntimeAccountId'
>;

function ProxyControls(props: ProxyControlProps) {
  const isManual = props.proxyMode === BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_MANUAL;
  const isRuntime = props.proxyMode === BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_PROXY_RUNTIME;
  return (
    <Flex align="center" className="proxy-controls" gap="2" wrap="wrap">
      <Select.Root
        value={props.proxyMode}
        onValueChange={(value) => props.onProxyModeChange(value as BrowserProxyProviderKind)}
      >
        <Select.Trigger aria-label="代理" />
        <Select.Content>
          <Select.Item value={BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_NONE}>无代理</Select.Item>
          <Select.Item value={BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_MANUAL}>手动代理</Select.Item>
          <Select.Item value={BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_PROXY_RUNTIME}>代理服务</Select.Item>
        </Select.Content>
      </Select.Root>
      {isManual ? (
        <TextField.Root
          autoComplete="off"
          className="proxy-input"
          onChange={(event) => props.onManualProxyUrlChange(event.target.value)}
          placeholder="socks5://user:pass@host:port"
          value={props.manualProxyUrl}
        >
          <TextField.Slot><PlugZap size={14} /></TextField.Slot>
        </TextField.Root>
      ) : null}
      {isRuntime ? (
        <TextField.Root
          autoComplete="off"
          className="proxy-runtime-input"
          onChange={(event) => props.onProxyRuntimeAccountIdChange(event.target.value)}
          placeholder="出口配置 ID，可留空"
          value={props.proxyRuntimeAccountId}
        >
          <TextField.Slot><PlugZap size={14} /></TextField.Slot>
        </TextField.Root>
      ) : null}
    </Flex>
  );
}

type ManualFingerprintProps = Pick<
  CloudBrowserLauncherProps,
  'locale' | 'localeOptions' | 'onLocaleChange' | 'onTimezoneChange' | 'timezone' | 'timezoneOptions'
>;

function ManualFingerprintControls(props: ManualFingerprintProps) {
  return (
    <Flex align="center" className="manual-fingerprint" gap="2" wrap="wrap">
      <Select.Root value={props.locale} onValueChange={props.onLocaleChange}>
        <Select.Trigger aria-label="Locale" className="locale-select" />
        <Select.Content>
          {props.localeOptions.map((item) => <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>)}
        </Select.Content>
      </Select.Root>
      <Select.Root value={props.timezone} onValueChange={props.onTimezoneChange}>
        <Select.Trigger aria-label="Timezone" />
        <Select.Content>
          {props.timezoneOptions.map((item) => <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>)}
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}

function RecentSessionAction({ session }: { session: BrowserSession }) {
  return (
    <Button asChild size="2" variant="soft">
      <Link to={paths.sessionLive(session.session_id)}>
        <ExternalLink size={15} />
        继续
        <Text as="span" className="recent-session-meta">
          {browserKindLabel(session.profile?.browser_kind || BrowserKind.BROWSER_KIND_UNSPECIFIED)} · {sessionStatusLabel(session.status)}
        </Text>
        <ArrowRight size={14} />
      </Link>
    </Button>
  );
}
