import { Link, useLocation } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { Map, Shield } from 'lucide-react';
import type { Lang } from '@/types/api';
import { useT } from '@/i18n/useT';
import { LANG_STORAGE_KEY } from '@/lib/constants';

function resolveLang(): Lang {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return stored === 'bn' ? 'bn' : 'en';
}

export function NotFoundPage() {
  const location = useLocation();
  const lang = resolveLang();
  const t = useT(lang);
  const mapHref = lang === 'bn' ? '/bn' : '/';

  return (
    <>
      <Helmet>
        <title>{t('notFound.title')} | LashKoi</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 py-12 text-slate-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(34 211 238 / 0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgb(99 102 241 / 0.12), transparent)',
          }}
        />
        <div className="relative z-10 flex max-w-md flex-col items-center text-center">
          <Link to={mapHref} className="mb-8">
            <img src="/logo.svg" alt="LashKoi" className="h-10 w-auto" />
          </Link>
          <p className="text-7xl font-bold tracking-tight text-slate-800">404</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-100 sm:text-2xl">
            {t('notFound.heading')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {t('notFound.body')}
          </p>
          {location.pathname !== '/' && (
            <p className="mt-4 max-w-full truncate rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 font-mono text-xs text-slate-500">
              {location.pathname}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={mapHref}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-500"
            >
              <Map className="h-4 w-4" aria-hidden />
              {t('notFound.map')}
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-900"
            >
              <Shield className="h-4 w-4" aria-hidden />
              {t('notFound.admin')}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = lang === 'en' ? 'bn' : 'en';
              localStorage.setItem(LANG_STORAGE_KEY, next);
              window.location.href = next === 'bn' ? '/bn' : '/';
            }}
            className="mt-6 text-sm text-slate-500 underline-offset-2 hover:text-cyan-400 hover:underline"
          >
            {lang === 'en' ? t('lang.bn') : t('lang.en')}
          </button>
        </div>
      </div>
    </>
  );
}
