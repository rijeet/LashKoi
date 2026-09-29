import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link } from 'react-router';
import { Clock, MapPin, X } from 'lucide-react';
import type { IncidentFeatureProperties } from '@/types/api';
import { MediaTabs, type MediaTab } from '@/components/incident/MediaTabs';
import { MediaStage } from '@/components/incident/MediaStage';

type Props = {
  incident: IncidentFeatureProperties | null;
  lang: string;
  onClose: () => void;
  onRecenter?: () => void;
  readMoreLabel: string;
  closeLabel: string;
  recenterLabel: string;
  panelTitle: string;
  reportLabel: string;
};

function availableTabs(media: IncidentFeatureProperties['media']): MediaTab[] {
  const tabs: MediaTab[] = [];
  if (media?.image) tabs.push('image');
  if (media?.youtube) tabs.push('youtube');
  if (media?.facebook) tabs.push('facebook');
  return tabs;
}

export function IncidentOverlayPanel({
  incident,
  lang,
  onClose,
  onRecenter,
  readMoreLabel,
  closeLabel,
  recenterLabel,
  panelTitle,
  reportLabel,
}: Props) {
  const tabs = useMemo(
    () => (incident ? availableTabs(incident.media) : []),
    [incident],
  );
  const [tab, setTab] = useState<MediaTab>('image');

  useEffect(() => {
    if (tabs.length) setTab(tabs[0]);
  }, [incident?.id, tabs]);

  if (!incident) return null;

  const safeSummary = DOMPurify.sanitize(incident.description);
  const dateLabel = new Date(incident.occurredAt).toLocaleString(
    lang === 'bn' ? 'bn-BD' : 'en-GB',
    { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' },
  );

  return (
    <>
      {/* Mobile sheet */}
      <aside
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[500] flex max-h-[70dvh] flex-col rounded-t-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md md:hidden"
      >
        <OverlayBody
          incident={incident}
          lang={lang}
          tabs={tabs}
          tab={tab}
          setTab={setTab}
          safeSummary={safeSummary}
          dateLabel={dateLabel}
          onClose={onClose}
          readMoreLabel={readMoreLabel}
          closeLabel={closeLabel}
          recenterLabel={recenterLabel}
          panelTitle={panelTitle}
          reportLabel={reportLabel}
          onRecenter={onRecenter}
        />
      </aside>
      {/* Desktop panel */}
      <aside
        className="pointer-events-auto absolute top-14 right-4 bottom-4 z-[500] hidden w-[420px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-md md:top-16 md:flex"
      >
        <OverlayBody
          incident={incident}
          lang={lang}
          tabs={tabs}
          tab={tab}
          setTab={setTab}
          safeSummary={safeSummary}
          dateLabel={dateLabel}
          onClose={onClose}
          readMoreLabel={readMoreLabel}
          closeLabel={closeLabel}
          recenterLabel={recenterLabel}
          panelTitle={panelTitle}
          reportLabel={reportLabel}
          onRecenter={onRecenter}
        />
      </aside>
    </>
  );
}

function OverlayBody({
  incident,
  lang,
  tabs,
  tab,
  setTab,
  safeSummary,
  dateLabel,
  onClose,
  readMoreLabel,
  closeLabel,
  recenterLabel,
  panelTitle,
  reportLabel,
  onRecenter,
}: {
  incident: IncidentFeatureProperties;
  lang: string;
  tabs: MediaTab[];
  tab: MediaTab;
  setTab: (t: MediaTab) => void;
  safeSummary: string;
  dateLabel: string;
  onClose: () => void;
  readMoreLabel: string;
  closeLabel: string;
  recenterLabel: string;
  panelTitle: string;
  reportLabel: string;
  onRecenter?: () => void;
}) {
  return (
    <>
      <div className="flex flex-none items-center justify-between border-b border-slate-700/80 bg-slate-800/80 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-200">
          {panelTitle}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-700/60 hover:text-white"
          aria-label={closeLabel}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            {incident.source && (
              <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-400">
                {incident.source}
              </span>
            )}
            {incident.placeName && (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-red-400" />
                {incident.placeName}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-bold leading-snug text-white sm:text-xl">
            {incident.headline}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {dateLabel}
          </p>
        </div>
        {tabs.length > 0 && (
          <>
            <MediaTabs active={tab} available={tabs} onChange={setTab} />
            <MediaStage
              tab={tab}
              media={incident.media}
              caption={incident.bannerCaption}
            />
          </>
        )}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {reportLabel}
          </span>
          <div
            className="text-xs leading-relaxed text-slate-300 sm:text-sm"
            dangerouslySetInnerHTML={{ __html: safeSummary }}
          />
        </div>
        <Link
          to={`/${lang}/incidents/${incident.slug}`}
          className="inline-block text-sm font-medium text-cyan-400 hover:underline"
        >
          {readMoreLabel}
        </Link>
      </div>
      <div className="flex flex-none items-center justify-between border-t border-slate-800 bg-slate-800/50 px-4 py-2.5 text-[11px] text-slate-400">
        <span>
          Ref: <strong className="text-slate-200">{incident.refCode}</strong>
        </span>
        {onRecenter && (
          <button
            type="button"
            onClick={onRecenter}
            className="font-medium text-blue-400 hover:underline"
          >
            {recenterLabel}
          </button>
        )}
      </div>
    </>
  );
}
