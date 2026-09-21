import en from './en.json';
import ar from './ar.json';

export type Locale = 'en' | 'ar';
export type Dictionary = typeof en;
const dictionaries: Record<Locale, Dictionary> = { en, ar };
export const locales: Locale[] = ['en', 'ar'];
export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'ar';
}
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
