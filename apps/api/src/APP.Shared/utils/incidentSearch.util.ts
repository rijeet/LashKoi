/** pg_trgm `%` plus ILIKE fallback for short tokens and ref/slug. */
export function incidentSearchWhereSql(
  tableAlias: string,
  q: string,
  startParamIndex: number,
): { sql: string; params: unknown[]; nextIndex: number } {
  const term = q.trim();
  if (!term) {
    return { sql: '', params: [], nextIndex: startParamIndex };
  }
  const pattern = `%${term}%`;
  const p = startParamIndex;
  const sql = ` AND (
    (${tableAlias}.title_en % $${p}
      OR ${tableAlias}.title_bn % $${p}
      OR ${tableAlias}.summary_en % $${p}
      OR ${tableAlias}.place_name_en % $${p})
    OR ${tableAlias}.title_en ILIKE $${p + 1}
    OR ${tableAlias}.title_bn ILIKE $${p + 1}
    OR ${tableAlias}.summary_en ILIKE $${p + 1}
    OR ${tableAlias}.place_name_en ILIKE $${p + 1}
    OR ${tableAlias}.ref_code ILIKE $${p + 1}
    OR ${tableAlias}.slug ILIKE $${p + 1}
  )`;
  return { sql, params: [term, pattern], nextIndex: p + 2 };
}

export function incidentSearchTypeOrmWhere(): string {
  return `(
    i.title_en % :term OR i.title_bn % :term OR i.summary_en % :term OR i.place_name_en % :term
    OR i.title_en ILIKE :pattern OR i.title_bn ILIKE :pattern OR i.summary_en ILIKE :pattern
    OR i.place_name_en ILIKE :pattern OR i.ref_code ILIKE :pattern OR i.slug ILIKE :pattern
  )`;
}
