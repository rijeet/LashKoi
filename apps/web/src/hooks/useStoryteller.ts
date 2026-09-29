import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STORYTELLER_DAYS_LIMIT, STORYTELLER_INTERVAL_MS } from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import { getIncidentDays } from '@/services/get-incident-days';
import { getIncidentsGeoJson } from '@/services/get-incidents';
import type { IncidentFeatureProperties, Lang } from '@/types/api';

type Options = {
  lang: Lang;
  types?: string;
  division?: string;
  playing: boolean;
  onFocusIncident: (
    props: IncidentFeatureProperties,
    coordinates: [number, number],
  ) => void;
};

export function useStoryteller({
  lang,
  types,
  division,
  playing,
  onFocusIncident,
}: Options) {
  const [dayIndex, setDayIndex] = useState(0);
  const [incidentIndex, setIncidentIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const onFocusRef = useRef(onFocusIncident);
  onFocusRef.current = onFocusIncident;

  const daysQuery = useQuery({
    queryKey: queryKeys.incidentDays(lang, types, division),
    queryFn: () =>
      getIncidentDays(lang, types, division).then((d) =>
        d.slice(0, STORYTELLER_DAYS_LIMIT),
      ),
    staleTime: 60_000,
    enabled: playing,
  });

  const days = daysQuery.data ?? [];
  const activeDate = days[dayIndex]?.date;

  const dayIncidentsQuery = useQuery({
    queryKey: queryKeys.incidents({
      lang,
      types,
      division,
      date: activeDate,
      storyteller: true,
    }),
    queryFn: () =>
      getIncidentsGeoJson({
        lang,
        types,
        division,
        date: activeDate,
        limit: 200,
      }),
    enabled: playing && Boolean(activeDate),
    staleTime: 60_000,
  });

  const dayFeatures = dayIncidentsQuery.data?.features ?? [];

  useEffect(() => {
    if (!playing) return;
    setDayIndex(0);
    setIncidentIndex(0);
  }, [playing, types, division, lang]);

  useEffect(() => {
    if (!playing || !dayFeatures.length) return;
    const feat = dayFeatures[incidentIndex % dayFeatures.length];
    if (feat?.properties && feat.geometry?.coordinates) {
      onFocusRef.current(feat.properties, feat.geometry.coordinates);
    }
  }, [playing, dayFeatures, incidentIndex, activeDate]);

  const daysLen = days.length;
  const slugsLen = dayFeatures.length;

  useEffect(() => {
    if (!playing || !daysLen || !slugsLen) return;

    const timer = setInterval(() => {
      setIncidentIndex((prev) => {
        if (prev + 1 < slugsLen) return prev + 1;
        setDayIndex((d) => (d + 1 < daysLen ? d + 1 : 0));
        return 0;
      });
    }, STORYTELLER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [playing, daysLen, slugsLen, activeDate]);

  useEffect(() => {
    if (!playing || !slugsLen) {
      setSlideProgress(0);
      return;
    }
    const started = performance.now();
    const tick = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - started) / STORYTELLER_INTERVAL_MS);
      setSlideProgress(p);
    }, 50);
    return () => window.clearInterval(tick);
  }, [playing, incidentIndex, activeDate, slugsLen]);

  return {
    daysLoaded: days.length,
    activeDate,
    incidentIndex,
    dayIncidentCount: dayFeatures.length,
    slideProgress,
    loading: daysQuery.isLoading || dayIncidentsQuery.isLoading,
  };
}
