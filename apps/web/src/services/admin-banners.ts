import { apiRequest } from '@/services/api-client';

export type AdminBannerDto = {
  id: string;
  incidentId: string | null;
  imageUrl: string;
  captionEn: string | null;
  captionBn: string | null;
  sectionType: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  incidentSlug: string | null;
  incidentTitleEn: string | null;
};

export type BannerFormBody = {
  incidentId?: string | null;
  imageUrl: string;
  captionEn?: string | null;
  captionBn?: string | null;
  sectionType?: string;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export function listAdminBanners() {
  return apiRequest<AdminBannerDto[]>('/admin/banners', { auth: true });
}

export function createAdminBanner(body: BannerFormBody) {
  return apiRequest<AdminBannerDto>('/admin/banners', {
    method: 'POST',
    auth: true,
    body,
  });
}

export function patchAdminBanner(id: string, body: Partial<BannerFormBody>) {
  return apiRequest<AdminBannerDto>(`/admin/banners/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteAdminBanner(id: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/banners/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}
