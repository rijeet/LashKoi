export const SPLASH_SESSION_KEY = 'lk_splash_seen';
export const LANG_STORAGE_KEY = 'lk_lang';
export const REFRESH_TOKEN_KEY = 'lk_refresh_token';

export const SPLASH_AUTO_ENTER_MS = 12_000;
export const SPLASH_PREFETCH_TIMEOUT_MS = 15_000;

/** D6 — storyteller slide duration */
export const STORYTELLER_INTERVAL_MS = 5_000;
export const STORYTELLER_DAYS_LIMIT = 30;

/** Bangladesh bounds [southWest, northEast] for Leaflet */
export const BD_BOUNDS: [[number, number], [number, number]] = [
  [20.5, 88.0],
  [26.7, 92.7],
];

export const BD_CENTER: [number, number] = [23.685, 90.356];
