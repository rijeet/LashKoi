export type Lang = 'en' | 'bn';

export function pickLang(lang?: string): Lang {
  return lang === 'bn' ? 'bn' : 'en';
}

export function localized(
  lang: Lang,
  en: string | null | undefined,
  bn: string | null | undefined,
): string {
  if (lang === 'bn' && bn) return bn;
  return en ?? bn ?? '';
}
