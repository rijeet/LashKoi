import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import { queryKeys } from '@/lib/query-keys';
import { getIncidentBySlug } from '@/services/get-incident';
import type { Lang } from '@/types/api';

export function IncidentSeoPage() {
  const { lang: langParam, slug } = useParams();
  const lang: Lang = langParam === 'bn' ? 'bn' : 'en';

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.incident(slug ?? '', lang),
    queryFn: () => getIncidentBySlug(slug!, lang),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return <p className="p-8 text-slate-400">Loading…</p>;
  }
  if (isError || !data) {
    return <p className="p-8 text-red-400">Incident not found.</p>;
  }

  const body = data.bodyHtml ? DOMPurify.sanitize(data.bodyHtml) : '';

  const site = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '');
  const canonical = site && slug ? `${site}/${lang}/incidents/${slug}` : '';
  const alternates =
    site && slug
      ? {
          en: `${site}/en/incidents/${slug}`,
          bn: `${site}/bn/incidents/${slug}`,
        }
      : undefined;
  const seoTitle = `${data.headline} | LashKoi`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: data.headline,
    datePublished: data.publishedAt,
    dateModified: data.updatedAt,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-slate-200">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={data.description} />
        {canonical && <link rel="canonical" href={canonical} />}
        {alternates?.en && <link rel="alternate" hrefLang="en" href={alternates.en} />}
        {alternates?.bn && <link rel="alternate" hrefLang="bn" href={alternates.bn} />}
        {alternates?.en && (
          <link rel="alternate" hrefLang="x-default" href={alternates.en} />
        )}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={data.description} />
        {canonical && <meta property="og:url" content={canonical} />}
        {data.media?.image && <meta property="og:image" content={data.media.image} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <p className="text-sm text-cyan-400">{data.refCode}</p>
      <h1 className="mt-2 text-3xl font-bold">{data.headline}</h1>
      <p className="mt-2 text-slate-400">{data.placeName}</p>
      {data.media?.image && (
        <img src={data.media.image} alt="" className="mt-6 w-full rounded-xl" />
      )}
      <div className="prose prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: body }} />
    </article>
  );
}
