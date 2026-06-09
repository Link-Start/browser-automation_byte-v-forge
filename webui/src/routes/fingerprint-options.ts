import localeCodes from 'locale-codes';

export type SelectOption = { label: string; value: string };

type LocaleCode = { local?: string | null; location?: string | null; name: string; tag: string };

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

export function localeOptions(): SelectOption[] {
  const options = (localeCodes.all as LocaleCode[])
    .filter((item) => isValidLocale(item.tag))
    .map((item) => ({ label: localeLabel(item), value: new Intl.Locale(item.tag).toString() }));
  return uniqueOptions(options).sort((left, right) => left.label.localeCompare(right.label));
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

function localeLabel(item: LocaleCode): string {
  const locale = new Intl.Locale(item.tag).toString();
  const parts = [item.name, item.location].filter(Boolean).join(' · ');
  return `${parts || locale} (${locale})`;
}

function uniqueOptions(options: SelectOption[]): SelectOption[] {
  const seen = new Set<string>();
  return options.filter((item) => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

function supportedTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return [defaultTimezone];
}
