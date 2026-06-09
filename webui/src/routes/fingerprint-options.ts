export type SelectOption = { label: string; value: string };

const defaultLocale = 'en-US';
const defaultTimezone = 'UTC';

export function initialLocale(): string {
  const candidate = navigator.languages.find(isValidLocale) || navigator.language;
  return isValidLocale(candidate) ? candidate : defaultLocale;
}

export function initialTimezone(): string {
  const candidate = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezoneOptions().some((item) => item.value === candidate) ? candidate : defaultTimezone;
}

export function timezoneOptions(): SelectOption[] {
  return supportedTimezones().map((value) => ({ label: value, value }));
}

export function isValidLocale(value: string): boolean {
  const locale = value.trim();
  if (!locale) return true;
  try {
    new Intl.Locale(locale);
    return true;
  } catch {
    return false;
  }
}

function supportedTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return [defaultTimezone];
}
