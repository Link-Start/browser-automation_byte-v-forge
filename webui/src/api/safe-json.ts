const redactedValue = '[已隐藏]';
const messagePreviewLimit = 700;
const textPreviewLimit = 4_000;
const sensitiveInlinePattern = /\b(authorization|cookie|credential|password|proxy|secret|token|api[_-]?key)\b\s*([:=])\s*["']?[^"'\s,;]+["']?/gi;
const sensitiveKeyPattern = /(authorization|cookie|credential|password|proxy[_-]?(ref|url)?|secret|storage_state|token|api[_-]?key)/i;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const urlPattern = /\b(?:https?|socks5h?):\/\/[^\s<>"']+/g;

export function safeJSONStringify(value: unknown): string {
  return JSON.stringify(redactJSON(value), null, 2);
}

export function safeTextPreview(value: string): string {
  return safeText(value, textPreviewLimit, '\n…已截断，避免长正文影响页面性能。');
}

export function safeMessage(value: string): string {
  return safeText(value, messagePreviewLimit, '…');
}

export function safeURL(value: string): string {
  return String(redactURL(value));
}

function redactJSON(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactJSON);
  }
  if (!value || typeof value !== 'object') {
    return redactURL(value);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? redactedValue : redactJSON(entry)
    ])
  );
}

function isSensitiveKey(key: string) {
  return sensitiveKeyPattern.test(key);
}

function safeText(value: string, limit: number, suffix: string) {
  const redacted = redactInlineSecrets(redactURLsInText(value));
  if (redacted.length <= limit) {
    return redacted;
  }
  return `${redacted.slice(0, limit)}${suffix}`;
}

function redactInlineSecrets(value: string) {
  return value
    .replace(bearerPattern, `Bearer ${redactedValue}`)
    .replace(sensitiveInlinePattern, (_match, key: string, separator: string) => `${key}${separator}${redactedValue}`);
}

function redactURLsInText(value: string) {
  return value.replace(urlPattern, (url) => String(redactURL(url)));
}

function redactURL(value: unknown): unknown {
  if (typeof value !== 'string' || !looksLikeURL(value)) {
    return value;
  }
  try {
    const url = new URL(value);
    url.username = url.username ? redactedValue : '';
    url.password = url.password ? redactedValue : '';
    for (const key of url.searchParams.keys()) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, redactedValue);
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

function looksLikeURL(value: string) {
  return /^(https?|socks5h?):\/\//i.test(value);
}
