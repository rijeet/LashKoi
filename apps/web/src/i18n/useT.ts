import { useMemo } from 'react';
import type { Lang } from '@/types/api';
import en from './en.json';
import bn from './bn.json';

const catalogs: Record<Lang, Record<string, string>> = { en, bn };

export function useT(lang: Lang) {
  return useMemo(() => {
    const dict = catalogs[lang] ?? en;
    return (key: string) =>
      (dict as Record<string, string>)[key] ??
      (en as Record<string, string>)[key] ??
      key;
  }, [lang]);
}
