import { useQuery } from '@tanstack/react-query';
import { getDistricts } from '@/services/get-boundaries';
import { districtsFromGeoJson } from '@/lib/static-boundaries';
import type { Lang } from '@/types/api';

export function useDistrictOptions(divisionPcode: string, lang: Lang) {
  return useQuery({
    queryKey: ['boundaries', 'districts', divisionPcode, lang, 'v2'],
    enabled: Boolean(divisionPcode),
    staleTime: 86400_000,
    queryFn: async () => {
      try {
        const api = await getDistricts(divisionPcode, lang);
        if (api.length > 0) return api;
      } catch {
        /* fall through */
      }
      return districtsFromGeoJson(divisionPcode, lang);
    },
  });
}
