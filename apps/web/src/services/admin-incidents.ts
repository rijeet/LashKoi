import { apiRequest } from '@/services/api-client';
import type { AdminIncidentDto, AdminIncidentListDto, IncidentMediaDto } from '@/types/api';

export type AdminIncidentListQuery = {
  status?: string;
  types?: string;
  division?: string;
  q?: string;
  locationConfirmed?: string;
  importBatchId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateIncidentBody = {
  type: string;
  titleEn: string;
  titleBn?: string;
  summaryEn: string;
  summaryBn?: string;
  bodyHtml?: string;
  placeNameEn?: string;
  placeNameBn?: string;
  location: { lat: number; lng: number };
  divisionPcode: string;
  districtPcode: string;
  upazilaPcode?: string | null;
  unionPcode?: string | null;
  sourceLabel: string;
  sourceUrl?: string;
  occurredAt: string;
  slug?: string | null;
  bannerCaptionEn?: string;
  bannerCaptionBn?: string | null;
  caseCount?: number | null;
  media?: IncidentMediaDto;
};

export function listAdminIncidents(query: AdminIncidentListQuery = {}) {
  return apiRequest<AdminIncidentListDto>('/admin/incidents', {
    auth: true,
    query: {
      status: query.status,
      types: query.types,
      division: query.division,
      q: query.q,
      locationConfirmed: query.locationConfirmed,
      importBatchId: query.importBatchId,
      page: query.page,
      pageSize: query.pageSize,
    },
  });
}

export function getAdminIncident(id: string) {
  return apiRequest<AdminIncidentDto>(`/admin/incidents/${id}`, { auth: true });
}

export function createAdminIncident(body: CreateIncidentBody) {
  return apiRequest<AdminIncidentDto>('/admin/incidents', {
    method: 'POST',
    auth: true,
    body,
  });
}

export function patchAdminIncident(id: string, body: Partial<CreateIncidentBody>) {
  return apiRequest<AdminIncidentDto>(`/admin/incidents/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function publishAdminIncident(id: string) {
  return apiRequest<AdminIncidentDto>(`/admin/incidents/${id}/publish`, {
    method: 'POST',
    auth: true,
  });
}

export function unpublishAdminIncident(id: string) {
  return apiRequest<AdminIncidentDto>(`/admin/incidents/${id}/unpublish`, {
    method: 'POST',
    auth: true,
  });
}

export function deleteAdminIncident(id: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/incidents/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

export type AdminIncidentAuditEntry = {
  id: string;
  action: string;
  at: string;
  diff: Record<string, unknown> | null;
  user: { id: string; email: string | null } | null;
};

export function getAdminIncidentAudit(id: string) {
  return apiRequest<AdminIncidentAuditEntry[]>(`/admin/incidents/${id}/audit`, {
    auth: true,
  });
}
