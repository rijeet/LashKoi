import { apiRequest } from '@/services/api-client';
import type { Lang } from '@/types/api';

export interface FeaturedBannerDto {
  id: string;
  imageUrl: string;
  caption: string;
  sectionType: string;
  incident: { slug: string; headline: string } | null;
}

export function getFeaturedBanners(lang: Lang) {
  return apiRequest<FeaturedBannerDto[]>('/featured-banners', { query: { lang } });
}
