import { apiRequest } from '@/services/api-client';
import type { IncidentTypeDto, Lang } from '@/types/api';

export function getIncidentTypes(lang: Lang) {
  return apiRequest<IncidentTypeDto[]>('/incident-types', { query: { lang } });
}
