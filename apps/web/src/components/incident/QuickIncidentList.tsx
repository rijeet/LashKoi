import type { IncidentFeatureProperties } from '@/types/api';

type Props = {
  incidents: IncidentFeatureProperties[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  title: string;
};

export function QuickIncidentList({
  incidents,
  selectedSlug,
  onSelect,
  title,
}: Props) {
  if (!incidents.length) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-[500] hidden max-w-xs rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-md sm:block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </span>
      <ul className="max-h-36 space-y-1.5 overflow-y-auto">
        {incidents.slice(0, 12).map((inc) => (
          <li key={inc.id}>
            <button
              type="button"
              onClick={() => onSelect(inc.slug)}
              className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${
                inc.slug === selectedSlug
                  ? 'bg-blue-600/30 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{ background: inc.markerColor }}
              />
              {inc.headline.length > 48
                ? `${inc.headline.slice(0, 48)}…`
                : inc.headline}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
