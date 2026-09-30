import type { Lang } from '@/types/api';
import type { IncidentsQuery } from '@/services/get-incidents';

export const queryKeys = {
  incidentTypes: (lang: Lang) => ['incident-types', lang] as const,
  stats: (lang: Lang) => ['stats', lang] as const,
  healthDistricts: (p: {
    lang: Lang;
    type?: string;
    division?: string;
    days?: number;
  }) => ['healthDistricts', p] as const,
  divisions: (lang: Lang) => ['boundaries', 'divisions', lang] as const,
  incidentDays: (lang: Lang, types?: string, division?: string) =>
    ['incident-days', { lang, types, division }] as const,
  incidentDaysMonth: (
    lang: Lang,
    types?: string,
    division?: string,
    monthKey?: string,
  ) => ['incident-days-month', { lang, types, division, monthKey }] as const,
  incidents: (params: IncidentsQuery) => ['incidents', params] as const,
  incident: (slug: string, lang: Lang) => ['incident', slug, lang] as const,
  banners: (lang: Lang) => ['banners', lang] as const,
  adminIncidents: (filters: {
    q?: string;
    status?: string;
    locationConfirmed?: string;
    importBatchId?: string;
  }) => ['admin', 'incidents', filters] as const,
  adminIncident: (id: string) => ['admin', 'incident', id] as const,
};
