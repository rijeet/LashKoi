import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router';

const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);
import { MapHeader } from '@/components/map/MapHeader';
import { BreakingBannerStrip } from '@/components/map/BreakingBannerStrip';
import { useStoryteller } from '@/hooks/useStoryteller';
import { IncidentOverlayPanel } from '@/components/incident/IncidentOverlayPanel';
import { QuickIncidentList } from '@/components/incident/QuickIncidentList';
import { useMapSelection } from '@/context/MapSelectionContext';
import { queryKeys } from '@/lib/query-keys';
import { getIncidentTypes } from '@/services/get-incident-types';
import { getDivisions } from '@/services/get-boundaries';
import { useDistrictOptions } from '@/hooks/useDistrictOptions';
import { getIncidentsGeoJson } from '@/services/get-incidents';
import type { Lang } from '@/types/api';
import type { LatLngTuple } from 'leaflet';
import { useT } from '@/i18n/useT';
import { LANG_STORAGE_KEY } from '@/lib/constants';
import { toLeafletLatLng } from '@/lib/mappers';
import { formatDayLabel, isValidDay } from '@/lib/dhaka-date';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getHealthDistricts } from '@/services/get-health-districts';
import { HealthChoroplethLegend } from '@/components/map/HealthChoroplethLegend';
import {
  HEALTH_TYPE_COLORS,
} from '@/lib/health-choropleth';

function parseLang(raw: string | null): Lang {
  return raw === 'bn' ? 'bn' : 'en';
}

export function MapPage() {
  const { lang: routeLang } = useParams();
  const [params, setParams] = useSearchParams();
  const lang = parseLang(
    routeLang ?? params.get('lang') ?? localStorage.getItem(LANG_STORAGE_KEY),
  );
  const t = useT(lang);
  const { selected, select } = useMapSelection();
  const [recenterTick, setRecenterTick] = useState(0);
  const [storytellerPlaying, setStorytellerPlaying] = useState(true);
  const [storytellerFly, setStorytellerFly] = useState<LatLngTuple | null>(null);

  const typeFilter = params.get('type') ?? '';
  const division = params.get('division') ?? '';
  const district = params.get('district') ?? '';
  const incidentSlug = params.get('incident') ?? '';
  const q = params.get('q') ?? '';
  const rawDate = params.get('date') ?? '';
  const dateFilter = rawDate && isValidDay(rawDate) ? rawDate : '';
  const debouncedQ = useDebouncedValue(q, 400);

  useEffect(() => {
    if (dateFilter) setStorytellerPlaying(false);
  }, [dateFilter]);

  const healthChoroplethType =
    typeFilter === 'dengue' || typeFilter === 'measles' ? typeFilter : null;

  const typesQuery = useQuery({
    queryKey: queryKeys.incidentTypes(lang),
    queryFn: () => getIncidentTypes(lang),
    staleTime: 60 * 60 * 1000,
  });
  const divisionsQuery = useQuery({
    queryKey: queryKeys.divisions(lang),
    queryFn: () => getDivisions(lang),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const districtsQuery = useDistrictOptions(division, lang);
  const incidentsQuery = useQuery({
    queryKey: queryKeys.incidents({
      lang,
      types: typeFilter || undefined,
      division: division || undefined,
      district: district || undefined,
      date: dateFilter || undefined,
      q: debouncedQ || undefined,
    }),
    queryFn: () =>
      getIncidentsGeoJson({
        lang,
        types: typeFilter || undefined,
        division: division || undefined,
        district: district || undefined,
        date: dateFilter || undefined,
        q: debouncedQ || undefined,
      }),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const healthDistrictsQuery = useQuery({
    queryKey: queryKeys.healthDistricts({
      lang,
      type: healthChoroplethType ?? undefined,
      division: division || undefined,
      days: 30,
    }),
    queryFn: () =>
      getHealthDistricts({
        lang,
        type: healthChoroplethType!,
        division: division || undefined,
        days: 30,
      }),
    enabled: Boolean(healthChoroplethType),
    staleTime: 5 * 60 * 1000,
  });

  const healthChoropleth = useMemo(() => {
    if (!healthChoroplethType || !healthDistrictsQuery.data) return null;
    const byPcode = new Map<string, number>();
    for (const row of healthDistrictsQuery.data.districts) {
      const value =
        healthChoroplethType === 'dengue'
          ? row.dengue
          : healthChoroplethType === 'measles'
            ? row.measles
            : row.total;
      byPcode.set(row.pcode, value);
    }
    return {
      byPcode,
      maxTotal: healthDistrictsQuery.data.maxTotal,
      accentColor:
        HEALTH_TYPE_COLORS[healthChoroplethType] ?? '#10b981',
    };
  }, [healthChoroplethType, healthDistrictsQuery.data]);

  const healthTypeLabel = useMemo(() => {
    if (!healthChoroplethType) return '';
    return (
      typesQuery.data?.find((t) => t.code === healthChoroplethType)?.label ??
      healthChoroplethType
    );
  }, [healthChoroplethType, typesQuery.data]);

  const selectedIncident = useMemo(() => {
    if (selected) return selected;
    if (!incidentSlug || !incidentsQuery.data) return null;
    return (
      incidentsQuery.data.features.find((f) => f.properties.slug === incidentSlug)
        ?.properties ?? null
    );
  }, [selected, incidentSlug, incidentsQuery.data]);

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const updateParam = (key: string, value: string) => {
    updateParams({ [key]: value });
  };

  const onSelectIncident = useCallback(
    (slug: string) => {
      setStorytellerPlaying(false);
      const props = incidentsQuery.data?.features.find(
        (f) => f.properties.slug === slug,
      )?.properties;
      if (props) select(props);
      setStorytellerFly(null);
      updateParam('incident', slug);
    },
    [incidentsQuery.data, select, updateParam],
  );

  const storyteller = useStoryteller({
    lang,
    types: typeFilter || undefined,
    division: division || undefined,
    playing: storytellerPlaying,
    onFocusIncident: (props, coordinates) => {
      select(props);
      updateParam('incident', props.slug);
      setStorytellerFly(toLeafletLatLng(coordinates));
    },
  });

  const flyBounds = useMemo(() => {
    const area =
      districtsQuery.data?.find((d) => d.pcode === district) ??
      divisionsQuery.data?.find((d) => d.pcode === division);
    if (!area?.bbox) return null;
    const [w, s, e, n] = area.bbox;
    return [[s, w], [n, e]] as [[number, number], [number, number]];
  }, [division, district, divisionsQuery.data, districtsQuery.data]);

  const flyCenter = useMemo(() => {
    if (storytellerFly) return storytellerFly;
    if (!selectedIncident || !incidentsQuery.data) return null;
    const feat = incidentsQuery.data.features.find(
      (f) => f.properties.slug === selectedIncident.slug,
    );
    if (!feat) return null;
    return toLeafletLatLng(feat.geometry.coordinates);
  }, [selectedIncident, incidentsQuery.data, recenterTick, storytellerFly]);

  const quickList = useMemo(
    () => incidentsQuery.data?.features.map((f) => f.properties) ?? [],
    [incidentsQuery.data],
  );

  const showNoIncidentsOnDay =
    Boolean(dateFilter) &&
    !incidentsQuery.isLoading &&
    !incidentsQuery.isError &&
    (incidentsQuery.data?.features.length ?? 0) === 0;

  const onDateChange = useCallback(
    (value: string) => {
      if (value) setStorytellerPlaying(false);
      updateParam('date', value);
    },
    [updateParam],
  );

  return (
    <div className="relative h-full w-full">
      <MapHeader
        lang={lang}
        types={typesQuery.data ?? []}
        divisions={divisionsQuery.data ?? []}
        districts={districtsQuery.data ?? []}
        districtsLoading={districtsQuery.isLoading}
        selectedType={typeFilter}
        selectedDivision={division}
        selectedDistrict={district}
        selectedDate={dateFilter}
        search={q}
        onTypeChange={(v) => updateParam('type', v)}
        onDateChange={onDateChange}
        onDivisionChange={(v) => {
          updateParams({ division: v, district: '' });
        }}
        onDistrictChange={(v) => updateParam('district', v)}
        onSearchChange={(v) => updateParam('q', v)}
        onLangToggle={() => {
          const next = lang === 'en' ? 'bn' : 'en';
          localStorage.setItem(LANG_STORAGE_KEY, next);
          updateParam('lang', next);
        }}
        storytellerPlaying={storytellerPlaying}
        storytellerProgress={storyteller.slideProgress}
        onStorytellerToggle={() => {
          setStorytellerPlaying((p) => {
            const next = !p;
            if (next) updateParam('date', '');
            return next;
          });
        }}
        labels={{
          search: t('header.search'),
          allTypes: t('header.allTypes'),
          allDivisions: t('header.allDivisions'),
          allDistricts: t('header.allDistricts'),
          langEn: t('lang.en'),
          langBn: t('lang.bn'),
          storytellerPlay: t('storyteller.play'),
          storytellerPause: t('storyteller.pause'),
          allDates: t('header.allDates'),
          today: t('header.today'),
          clearDate: t('header.clearDate'),
          incidentsOnDay: t('header.incidentsOnDay'),
        }}
      />
      <BreakingBannerStrip lang={lang} />
      {healthChoropleth && healthDistrictsQuery.data && (
        <HealthChoroplethLegend
          lang={lang}
          typeLabel={healthTypeLabel}
          accentColor={healthChoropleth.accentColor}
          maxTotal={healthDistrictsQuery.data.maxTotal}
          days={healthDistrictsQuery.data.days}
        />
      )}
      {showNoIncidentsOnDay && (
        <div
          className="pointer-events-auto absolute bottom-4 left-4 z-[500] max-w-sm rounded-md border border-slate-600/80 bg-slate-900/90 px-3 py-2 text-sm text-slate-200"
        >
          {t('map.noIncidentsOnDay').replace(
            '{day}',
            formatDayLabel(dateFilter, lang),
          )}
        </div>
      )}
      {incidentsQuery.isError && (
        <div
          className="pointer-events-auto absolute bottom-4 left-4 z-[500] flex max-w-sm flex-wrap items-center gap-2 rounded-md bg-red-950/90 px-3 py-2 text-sm text-red-100"
        >
          <span>{t('map.loadError')}</span>
          <button
            type="button"
            onClick={() => incidentsQuery.refetch()}
            disabled={incidentsQuery.isFetching}
            className="rounded border border-red-400/40 px-2 py-0.5 text-xs font-medium text-red-50 hover:bg-red-900/80 disabled:opacity-50"
          >
            {t('map.retry')}
          </button>
        </div>
      )}
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-500">
            {t('map.loading')}
          </div>
        }
      >
        <MapView
          flyBounds={flyBounds}
          flyCenter={flyCenter}
          selectedDivision={division}
          selectedDistrict={district}
          lang={lang}
          incidents={incidentsQuery.data}
          incidentSlug={incidentSlug}
          onSelectIncident={onSelectIncident}
          healthChoropleth={healthChoropleth}
        />
      </Suspense>
      <QuickIncidentList
        incidents={quickList}
        selectedSlug={incidentSlug}
        onSelect={onSelectIncident}
        title={t('overlay.quickList')}
      />
      <IncidentOverlayPanel
        incident={selectedIncident}
        lang={lang}
        onClose={() => {
          select(null);
          updateParam('incident', '');
        }}
        onRecenter={() => setRecenterTick((t) => t + 1)}
        readMoreLabel={t('overlay.readMore')}
        closeLabel={t('overlay.close')}
        recenterLabel={t('overlay.recenter')}
        panelTitle={t('overlay.panelTitle')}
        reportLabel={t('overlay.report')}
      />
    </div>
  );
}
