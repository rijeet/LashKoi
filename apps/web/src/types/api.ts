export type Lang = 'en' | 'bn';

export interface ApiEnvelope<T> {
  status: 'success' | 'error';
  message: string;
  statusCode: number;
  data: T;
}

export interface ApiErrorShape {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface IncidentTypeDto {
  code: string;
  label: string;
  iconKey: string;
  iconUrl: string | null;
  markerColor: string;
  isHealth: boolean;
  contentWarning: boolean;
  sortOrder: number;
}

export interface StatsSummaryDto {
  total: number;
  byType: Array<{
    code: string;
    label: string;
    count: number;
    last30Days: number;
    markerColor: string;
  }>;
  updatedAt: string;
}

export interface HealthDistrictRowDto {
  pcode: string;
  name: string;
  dengue: number;
  measles: number;
  total: number;
}

export interface HealthDistrictsDto {
  days: number;
  types: string[];
  districts: HealthDistrictRowDto[];
  maxTotal: number;
  updatedAt: string;
}

export interface AnalyticsOverviewDto {
  days: number;
  total: number;
  byType: Array<{ code: string; label: string; count: number }>;
  byDivision: Array<{ pcode: string; name: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  healthDistrictsTop: HealthDistrictRowDto[];
  updatedAt: string;
}

export interface BoundaryAreaDto {
  pcode: string;
  name: string;
  nameEn: string;
  nameBn: string;
  centroid: { lat: number; lng: number } | null;
  bbox: [number, number, number, number] | null;
}

export interface IncidentMediaDto {
  image?: string;
  youtube?: string;
  facebook?: string;
}

export interface IncidentFeatureProperties {
  id: string;
  refCode: string;
  slug: string;
  type: string;
  markerColor: string;
  iconKey: string;
  headline: string;
  occurredAt: string;
  source: string | null;
  placeName: string | null;
  division: { pcode: string; name: string };
  district: { pcode: string; name: string };
  description: string;
  media: IncidentMediaDto;
  bannerCaption: string | null;
  caseCount: number | null;
}

export interface IncidentsGeoJsonDto {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: IncidentFeatureProperties;
  }>;
  meta: { count: number; limit: number; truncated: boolean };
}

export interface IncidentDayDto {
  date: string;
  count: number;
}

export interface IncidentDetailDto extends IncidentFeatureProperties {
  location: { lat: number; lng: number };
  sourceUrl?: string | null;
  bodyHtml?: string | null;
  publishedAt?: string;
  updatedAt?: string;
}

export interface AdminIncidentListItemDto {
  id: string;
  refCode: string;
  slug: string;
  type: string;
  status: string;
  titleEn: string;
  divisionPcode: string;
  districtPcode: string;
  occurredAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AdminIncidentListDto {
  items: AdminIncidentListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminIncidentDto {
  id: string;
  refCode: string;
  slug: string;
  type: string;
  status: string;
  titleEn: string;
  titleBn: string | null;
  summaryEn: string;
  summaryBn: string | null;
  bodyHtml: string | null;
  placeNameEn: string | null;
  placeNameBn: string | null;
  location: { lat: number; lng: number } | null;
  divisionPcode: string;
  districtPcode: string;
  upazilaPcode: string | null;
  unionPcode: string | null;
  sourceLabel: string;
  sourceUrl: string | null;
  bannerCaptionEn: string | null;
  bannerCaptionBn: string | null;
  caseCount: number | null;
  occurredAt: string;
  publishedAt: string | null;
  updatedAt: string;
  media: IncidentMediaDto;
}
