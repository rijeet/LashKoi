import { apiRequest } from '@/services/api-client';
import type { IncidentDetailDto, Lang } from '@/types/api';

export function getIncidentBySlug(slug: string, lang: Lang) {
  return apiRequest<IncidentDetailDto>(`/incidents/${encodeURIComponent(slug)}`, {
    query: { lang },
  });
}
