import {
  BrowserKind,
  type StartBrowserSessionRequest
} from '../proto/browser/automation/v1/browser_automation';

export type SessionConfig = {
  browserKind: BrowserKind;
  locale: string;
  proxyRef: string;
  timezone: string;
};

export const defaultSessionConfig: SessionConfig = {
  browserKind: BrowserKind.BROWSER_KIND_CHROMIUM,
  locale: 'en-US',
  proxyRef: '',
  timezone: 'America/New_York'
};

export function validateSessionConfig(config: SessionConfig): string {
  if (!config.locale.trim()) {
    return 'Locale 不能为空。';
  }
  if (hasWhitespace(config.locale)) {
    return 'Locale 不能包含空格。';
  }
  if (!config.timezone.trim()) {
    return 'Timezone 不能为空。';
  }
  if (hasWhitespace(config.timezone)) {
    return 'Timezone 不能包含空格。';
  }
  if (config.proxyRef.length > 120) {
    return '代理引用不能超过 120 个字符。';
  }
  return '';
}

export function buildStartSessionRequest(config: SessionConfig, requestId: string): StartBrowserSessionRequest {
  return {
    labels: { source: 'standalone-webui' },
    profile: {
      browser_kind: config.browserKind,
      extra_http_headers: {},
      init_scripts: [],
      locale: config.locale.trim(),
      proxy_ref: config.proxyRef.trim(),
      storage_state_secret_ref: undefined,
      timezone: config.timezone.trim(),
      user_agent: '',
      viewport: undefined
    },
    request_id: requestId,
    security_policy: undefined,
    ttl: '1800s'
  };
}

function hasWhitespace(value: string) {
  return /\s/.test(value);
}
