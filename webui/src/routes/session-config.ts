import {
  BrowserKind,
  BrowserProxyProviderKind,
  type StartBrowserSessionRequest
} from '../proto/browser/automation/v1/browser_automation';

export type SessionConfig = {
  browserKind: BrowserKind;
  locale: string;
  manualProxyRef: string;
  manualProxyUrl: string;
  proxyProviderKind: BrowserProxyProviderKind;
  proxyRuntimeAccountId: string;
  proxyRuntimePurpose: string;
  timezone: string;
};

export const defaultSessionConfig: SessionConfig = {
  browserKind: BrowserKind.BROWSER_KIND_CHROMIUM,
  locale: '',
  manualProxyRef: '',
  manualProxyUrl: '',
  proxyProviderKind: BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_NONE,
  proxyRuntimeAccountId: '',
  proxyRuntimePurpose: '',
  timezone: ''
};

export function validateSessionConfig(config: SessionConfig): string {
  if (config.locale && hasWhitespace(config.locale)) {
    return 'Locale 不能包含空格。';
  }
  if (config.locale && !isValidLocale(config.locale)) {
    return 'Locale 格式无效。';
  }
  if (config.timezone && hasWhitespace(config.timezone)) {
    return 'Timezone 不能包含空格。';
  }
  if (config.manualProxyRef.length > 120 || config.proxyRuntimeAccountId.length > 120) {
    return '代理引用不能超过 120 个字符。';
  }
  if (config.manualProxyUrl.length > 500) return '代理地址不能超过 500 个字符。';
  if (config.manualProxyUrl && hasWhitespace(config.manualProxyUrl)) return '代理地址不能包含空格。';
  if (config.proxyRuntimePurpose.length > 80) return '代理用途不能超过 80 个字符。';
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
      proxy_ref: '',
      storage_state_secret_ref: undefined,
      timezone: config.timezone.trim(),
      user_agent: '',
      viewport: undefined
    },
    proxy: buildProxySelection(config),
    request_id: requestId,
    security_policy: undefined,
    ttl: '1800s'
  };
}

function buildProxySelection(config: SessionConfig) {
  const providerKind = effectiveProxyProviderKind(config);
  const manual = providerKind === BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_MANUAL;
  const runtime = providerKind === BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_PROXY_RUNTIME;
  return {
    manual_proxy_ref: manual ? config.manualProxyRef.trim() : '',
    manual_proxy_url: manual ? config.manualProxyUrl.trim() : '',
    provider_kind: providerKind,
    proxy_runtime_account_id: runtime ? config.proxyRuntimeAccountId.trim() : '',
    proxy_runtime_purpose: runtime ? config.proxyRuntimePurpose.trim() : ''
  };
}

function effectiveProxyProviderKind(config: SessionConfig): BrowserProxyProviderKind {
  const hasManualProxy = config.manualProxyRef.trim() || config.manualProxyUrl.trim();
  if (config.proxyProviderKind === BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_NONE && hasManualProxy) {
    return BrowserProxyProviderKind.BROWSER_PROXY_PROVIDER_KIND_MANUAL;
  }
  return config.proxyProviderKind;
}

function isValidLocale(value: string): boolean {
  try {
    new Intl.Locale(value.trim());
    return true;
  } catch {
    return false;
  }
}

function hasWhitespace(value: string) {
  return /\s/.test(value);
}
