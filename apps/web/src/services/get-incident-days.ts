import { apiRequest } from '@/services/api-client';
import type { IncidentDayDto, Lang } from '@/types/api';

export type IncidentDaysOptions = {
  before?: string;
  limit?: number;
};

export function getIncidentDays(
  lang: Lang,
  types?: string,
  division?: string,
  opts?: IncidentDaysOptions,
) {
  return apiRequest<IncidentDayDto[]>('/incidents/days', {
    query: {
      lang,
      types,
      division,
      limit: opts?.limit ?? 30,
      before: opts?.before,
    },
  });
}
