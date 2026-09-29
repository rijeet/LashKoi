import { apiRequest } from '@/services/api-client';
import type { AnalyticsOverviewDto, Lang } from '@/types/api';

export function getAdminAnalytics(lang: Lang = 'en', days = 30) {
  return apiRequest<AnalyticsOverviewDto>('/admin/analytics', {
    auth: true,
    query: { lang, days },
  });
}
