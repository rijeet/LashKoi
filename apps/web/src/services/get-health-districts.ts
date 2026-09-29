import { apiRequest } from '@/services/api-client';
import type { HealthDistrictsDto, Lang } from '@/types/api';

export function getHealthDistricts(params: {
  lang: Lang;
  type?: string;
  division?: string;
  days?: number;
}) {
  return apiRequest<HealthDistrictsDto>('/stats/health-districts', {
    query: {
      lang: params.lang,
      type: params.type,
      division: params.division,
      days: params.days ?? 30,
    },
  });
}
