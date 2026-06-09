import { Badge, Box, Button, Card, Flex, Grid, Heading, SegmentedControl, Text, TextField } from '@radix-ui/themes';
import type { FormEvent, ReactNode } from 'react';
import { Cloud, Code2, ExternalLink, Globe2, LockKeyhole, MonitorDot, Play, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { browserKindLabel, sessionStatusLabel } from '../api/defaults';
import { BrowserKind, type BrowserSession } from '../proto/browser/automation/v1/browser_automation';
import { paths } from '../routes/paths';

type CloudBrowserLauncherProps = {
  disabled: boolean;
  launchError?: string;
  launching: boolean;
  onLaunch: () => void;
  onPresetChange: (value: string) => void;
  onTargetUrlChange: (value: string) => void;
  presets: Array<{ description: string; id: string; label: string }>;
  recentSession?: BrowserSession;
  selectedPresetId: string;
  sessionCount: number;
  targetUrl: string;
  validationError: string;
};

export function CloudBrowserLauncher(props: CloudBrowserLauncherProps) {
  const feedback = props.validationError || props.launchError || '就绪';
  const selectedPreset = props.presets.find((preset) => preset.id === props.selectedPresetId) || props.presets[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.disabled && !props.validationError) {
      props.onLaunch();
    }
  }

  return (
    <section className="cloud-browser-card" aria-label="云浏览器">
      <Card className="cloud-browser-shell">
      <form className="cloud-browser-form" onSubmit={submit}>
        <div className="cloud-browser-topbar">
          <div className="window-dots"><span /><span /><span /></div>
          <div className="browser-tab"><Cloud size={14} />Cloud Browser</div>
          <Badge className="stage-status" color="green" variant="soft"><ShieldCheck size={12} />Isolated</Badge>
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
            placeholder="https://example.com"
            value={props.targetUrl}
          >
            <TextField.Slot><LockKeyhole size={15} /></TextField.Slot>
          </TextField.Root>
          <Button disabled={props.disabled || Boolean(props.validationError)} type="submit">
            {props.launching ? <Sparkles className="spin" size={16} /> : <Play size={16} />}启动
          </Button>
        </div>
        <Text as="p" id="cloud-browser-feedback" className={props.validationError || props.launchError ? 'form-feedback form-feedback-error' : 'form-feedback'} role={props.validationError || props.launchError ? 'alert' : 'status'} aria-live="polite">
          {feedback}
        </Text>
        <Flex align="center" className="cloud-profile-row" gap="3" wrap="wrap">
          <Box className="cloud-profile-copy">
            <Text as="p" size="2" weight="bold">浏览器画像</Text>
            <Text as="p" color="gray" size="1">{selectedPreset.description}</Text>
          </Box>
          <SegmentedControl.Root value={props.selectedPresetId} onValueChange={props.onPresetChange}>
            {props.presets.map((preset) => (
              <SegmentedControl.Item key={preset.id} value={preset.id}>{preset.label}</SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </Flex>
        <div className="cloud-browser-viewport">
          <div className="edge-glow" />
          <Box className="cloud-browser-copy">
            <p className="section-kicker">Remote isolated browser</p>
            <Heading as="h2">{props.recentSession ? '继续浏览' : '打开云浏览器'}</Heading>
            <Flex className="cloud-browser-actions" gap="2" wrap="wrap">
              {props.recentSession ? <RecentSessionAction session={props.recentSession} /> : null}
              <Button asChild size="2" variant="soft"><Link to={paths.openSession}><Radio size={14} />高级接管</Link></Button>
            </Flex>
          </Box>
          <Grid className="cloud-browser-stats" aria-label="会话摘要">
            <Metric icon={<MonitorDot size={16} />} label="可见会话" value={String(props.sessionCount)} />
            <Metric icon={<Globe2 size={16} />} label="当前画像" value={selectedPreset.label} />
            <Metric icon={<Code2 size={16} />} label="高级" value="可选" />
          </Grid>
        </div>
      </form>
      </Card>
    </section>
  );
}

function RecentSessionAction({ session }: { session: BrowserSession }) {
  return (
    <Button asChild size="2">
      <Link to={paths.sessionLive(session.session_id)}>
        <ExternalLink size={16} />进入 {browserKindLabel(session.profile?.browser_kind || BrowserKind.BROWSER_KIND_UNSPECIFIED)} · {sessionStatusLabel(session.status)}
      </Link>
    </Button>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <Card className="cloud-browser-stat">{icon}<strong>{value}</strong><small>{label}</small></Card>;
}
