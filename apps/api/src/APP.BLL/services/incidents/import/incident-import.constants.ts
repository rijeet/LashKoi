export const INCIDENT_TYPE_CODES = [
  'extortion',
  'measles',
  'kidnap',
  'dengue',
  'body_found',
] as const;

export const TYPE_SYNONYMS: Record<string, string> = {
  extortion: 'extortion',
  'চাঁদাবাজি': 'extortion',
  'চাঁদা': 'extortion',
  dengue: 'dengue',
  'ডেঙ্গু': 'dengue',
  'dengue fever': 'dengue',
  measles: 'measles',
  'হাম': 'measles',
  kidnap: 'kidnap',
  abduction: 'kidnap',
  'অপহরণ': 'kidnap',
  body_found: 'body_found',
  'body found': 'body_found',
  'body recovered': 'body_found',
  'লাশ উদ্ধার': 'body_found',
  'মরদেহ উদ্ধার': 'body_found',
};

/** Dhaka district placeholder for unconfirmed bulk imports */
export const DRAFT_PLACEHOLDER_GEO = {
  divisionPcode: 'BD30',
  districtPcode: 'BD3026',
  lat: 23.778,
  lng: 90.405,
};

export const BD_BBOX = {
  minLat: 20.5,
  maxLat: 26.7,
  minLng: 88.0,
  maxLng: 92.7,
};
