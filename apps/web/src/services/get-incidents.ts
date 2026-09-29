import { apiRequest } from '@/services/api-client';
import type { IncidentsGeoJsonDto, Lang } from '@/types/api';

export type IncidentsQuery = {
  lang: Lang;
  types?: string;
  division?: string;
  district?: string;
  date?: string;
  q?: string;
  limit?: number;
  /** Cache-bucket only (storyteller day fetches) */
  storyteller?: boolean;
};

export function getIncidentsGeoJson(params: IncidentsQuery) {
  return apiRequest<IncidentsGeoJsonDto>('/incidents', {
    query: {
      lang: params.lang,
      format: 'geojson',
      types: params.types,
      division: params.division,
      district: params.district,
      date: params.date,
      q: params.q,
      limit: params.limit ?? 500,
    },
  });
}
