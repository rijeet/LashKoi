import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CssLoadingSplash } from '@/components/splash/CssLoadingSplash';
import { BloodFlowTransition } from '@/components/splash/BloodFlowTransition';
import {
  SPLASH_AUTO_ENTER_MS,
  SPLASH_PREFETCH_TIMEOUT_MS,
  SPLASH_SESSION_KEY,
} from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import { getIncidentTypes } from '@/services/get-incident-types';
import { getStatsSummary } from '@/services/get-stats';
import { getDivisions } from '@/services/get-boundaries';
import { getIncidentDays } from '@/services/get-incident-days';
import { getFeaturedBanners } from '@/services/get-banners';
import { getIncidentsGeoJson } from '@/services/get-incidents';
import type { Lang, StatsSummaryDto } from '@/types/api';
import { useT } from '@/i18n/useT';

type Props = {
  lang: Lang;
  children: React.ReactNode;
};

export function SplashGate({ lang, children }: Props) {
  const t = useT(lang);
  const qc = useQueryClient();
  const skipSplash = sessionStorage.getItem(SPLASH_SESSION_KEY) === '1';
  const [phase, setPhase] = useState<'splash' | 'blood' | 'map'>(() =>
    skipSplash ? 'map' : 'splash',
  );
  const [statusText, setStatusText] = useState(t('splash.loadingTypes'));
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<StatsSummaryDto | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstDayRef = useRef<string | undefined>(undefined);

  const enterMap = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    setPhase('blood');
  }, []);

  const onBloodDone = useCallback(() => setPhase('map'), []);

  useEffect(() => {
    if (phase !== 'splash') return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, SPLASH_PREFETCH_TIMEOUT_MS);

    const steps = [
      async () => {
        setStatusText(t('splash.loadingTypes'));
        await qc.prefetchQuery({
          queryKey: queryKeys.incidentTypes(lang),
          queryFn: () => getIncidentTypes(lang),
          staleTime: 3600_000,
        });
      },
      async () => {
        setStatusText(t('splash.loadingBoundaries'));
        await qc.prefetchQuery({
          queryKey: queryKeys.divisions(lang),
          queryFn: () => getDivisions(lang),
          staleTime: 86400_000,
        });
      },
      async () => {
        setStatusText(t('splash.loadingDays'));
        const days = await qc.fetchQuery({
          queryKey: queryKeys.incidentDays(lang),
          queryFn: () => getIncidentDays(lang),
          staleTime: 60_000,
        });
        firstDayRef.current = days[0]?.date;
      },
      async () => {
        setStatusText(t('splash.loadingIncidents'));
        await qc.prefetchQuery({
          queryKey: queryKeys.incidents({ lang, date: firstDayRef.current }),
          queryFn: () =>
            getIncidentsGeoJson({ lang, date: firstDayRef.current }),
          staleTime: 30_000,
        });
      },
      async () => {
        setStatusText(t('splash.loadingStats'));
        const data = await qc.fetchQuery({
          queryKey: queryKeys.stats(lang),
          queryFn: () => getStatsSummary(lang),
          staleTime: 300_000,
        });
        setStats(data);
        await qc.prefetchQuery({
          queryKey: queryKeys.banners(lang),
          queryFn: () => getFeaturedBanners(lang),
          staleTime: 60_000,
        });
      },
    ];

    (async () => {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        try {
          await steps[i]();
        } catch {
          /* partial load OK */
        }
        setProgress(Math.round(((i + 1) / steps.length) * 100));
      }
      if (!cancelled) {
        setStatusText(t('splash.ready'));
        setReady(true);
        autoTimer.current = setTimeout(enterMap, SPLASH_AUTO_ENTER_MS);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [phase, lang, qc, t, enterMap]);

  if (phase === 'map') return <>{children}</>;

  return (
    <>
      {phase === 'splash' && (
        <CssLoadingSplash
          tag={t('app.tag')}
          statusText={statusText}
          progress={progress}
          stats={stats}
          ready={ready}
          onEnter={enterMap}
          onSkip={enterMap}
          enterLabel={t('splash.enter')}
          skipLabel={t('splash.skip')}
        />
      )}
      <BloodFlowTransition active={phase === 'blood'} onComplete={onBloodDone} />
    </>
  );
}
