import { apiRequest } from '@/services/api-client';
import type { Lang, StatsSummaryDto } from '@/types/api';

export function getStatsSummary(lang: Lang) {
  return apiRequest<StatsSummaryDto>('/stats/summary', { query: { lang } });
}
