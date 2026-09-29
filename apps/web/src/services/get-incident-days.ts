import { apiRequest } from '@/services/api-client';
import type { IncidentDayDto, Lang } from '@/types/api';

export function getIncidentDays(lang: Lang, types?: string, division?: string) {
  return apiRequest<IncidentDayDto[]>('/incidents/days', {
    query: { lang, types, division, limit: 30 },
  });
}
