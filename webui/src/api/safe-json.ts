const redactedValue = '[已隐藏]';
const sensitiveKeyPattern = /(authorization|cookie|credential|password|proxy_ref|secret|storage_state|token|api[_-]?key)/i;

export function safeJSONStringify(value: unknown): string {
  return JSON.stringify(redactJSON(value), null, 2);
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
  return value.startsWith('http://') || value.startsWith('https://');
}
