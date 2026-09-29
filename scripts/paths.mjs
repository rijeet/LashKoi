import path from 'path';

/** Monorepo root (parent of `scripts/`). */
export const ROOT = path.resolve(import.meta.dirname, '..');

/** Offline sources, Wikipedia dumps, bangladesh-geojson clone. */
export const REF_GEO = path.join(ROOT, 'reference', 'geo');

/** Legacy HTML prototypes. */
export const REF_PROTOTYPES = path.join(ROOT, 'reference', 'prototypes');
