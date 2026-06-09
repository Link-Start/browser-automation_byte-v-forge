export function normalizeBrowserUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateBrowserUrl(value: string) {
  const normalized = normalizeBrowserUrl(value);
  if (!normalized) return '请输入网址。';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '仅支持 http/https。';
    }
    return '';
  } catch {
    return '网址无效。';
  }
}
