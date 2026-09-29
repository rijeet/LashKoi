import { apiRequest } from '@/services/api-client';
import type { BoundaryAreaDto, Lang } from '@/types/api';

export function getDivisions(lang: Lang) {
  return apiRequest<BoundaryAreaDto[]>('/boundaries/divisions', { query: { lang } });
}

export function getDistricts(divisionPcode: string, lang: Lang) {
  return apiRequest<BoundaryAreaDto[]>(
    `/boundaries/divisions/${encodeURIComponent(divisionPcode)}/districts`,
    { query: { lang } },
  );
}

export function getUpazilas(districtPcode: string, lang: Lang) {
  return apiRequest<BoundaryAreaDto[]>(
    `/boundaries/districts/${encodeURIComponent(districtPcode)}/upazilas`,
    { query: { lang } },
  );
}
