export type IncidentSeoMeta = {
  title: string;
  description?: string | null;
  canonical?: string | null;
  ogImage?: string | null;
  alternates?: { en?: string; bn?: string };
  jsonLd?: Record<string, unknown>;
};

export function buildSeoHeadTags(meta: IncidentSeoMeta, lang: 'en' | 'bn'): string {
  const desc = meta.description?.trim() ?? '';
  const canonical =
    meta.alternates?.[lang] ?? meta.canonical ?? '';
  const ogUrl = canonical;
  const lines: string[] = [];

  if (desc) {
    lines.push(`<meta name="description" content="${escapeAttr(desc)}" />`);
  }
  if (canonical) {
    lines.push(`<link rel="canonical" href="${escapeAttr(canonical)}" />`);
  }
  if (meta.alternates?.en) {
    lines.push(
      `<link rel="alternate" hreflang="en" href="${escapeAttr(meta.alternates.en)}" />`,
    );
  }
  if (meta.alternates?.bn) {
    lines.push(
      `<link rel="alternate" hreflang="bn" href="${escapeAttr(meta.alternates.bn)}" />`,
    );
  }
  if (meta.alternates?.en && meta.alternates?.bn) {
    lines.push(
      `<link rel="alternate" hreflang="x-default" href="${escapeAttr(meta.alternates.en)}" />`,
    );
  }

  lines.push(`<meta property="og:type" content="article" />`);
  lines.push(`<meta property="og:title" content="${escapeAttr(meta.title)}" />`);
  if (desc) {
    lines.push(`<meta property="og:description" content="${escapeAttr(desc)}" />`);
  }
  if (ogUrl) {
    lines.push(`<meta property="og:url" content="${escapeAttr(ogUrl)}" />`);
  }
  if (meta.ogImage) {
    lines.push(`<meta property="og:image" content="${escapeAttr(meta.ogImage)}" />`);
  }

  if (meta.jsonLd) {
    lines.push(
      `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`,
    );
  }

  return lines.join('\n    ');
}

export function injectSeoIntoHtml(
  html: string,
  meta: IncidentSeoMeta,
  lang: 'en' | 'bn',
): string {
  const tags = buildSeoHeadTags(meta, lang);
  let out = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(meta.title)}</title>`,
  );
  out = out.replace('</head>', `    ${tags}\n  </head>`);
  return out;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export async function fetchIncidentSeoMeta(
  apiBase: string,
  slug: string,
): Promise<IncidentSeoMeta | null> {
  const base = apiBase.replace(/\/$/, '');
  const res = await fetch(`${base}/seo/incidents/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: IncidentSeoMeta };
  return body.data ?? (body as IncidentSeoMeta);
}
