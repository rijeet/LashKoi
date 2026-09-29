import { Pause, Play } from 'lucide-react';
import type { BoundaryAreaDto, IncidentTypeDto, Lang } from '@/types/api';

type Props = {
  lang: Lang;
  types: IncidentTypeDto[];
  divisions: BoundaryAreaDto[];
  districts: BoundaryAreaDto[];
  districtsLoading?: boolean;
  selectedType: string;
  selectedDivision: string;
  selectedDistrict: string;
  search: string;
  onTypeChange: (v: string) => void;
  onDivisionChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onLangToggle: () => void;
  storytellerPlaying?: boolean;
  storytellerProgress?: number;
  onStorytellerToggle?: () => void;
  labels: {
    search: string;
    allTypes: string;
    allDivisions: string;
    allDistricts: string;
    langEn: string;
    langBn: string;
    storytellerPlay: string;
    storytellerPause: string;
  };
};

export function MapHeader({
  types,
  divisions,
  districts,
  districtsLoading,
  selectedType,
  selectedDivision,
  selectedDistrict,
  search,
  onTypeChange,
  onDivisionChange,
  onDistrictChange,
  onSearchChange,
  onLangToggle,
  storytellerPlaying,
  storytellerProgress = 0,
  onStorytellerToggle,
  lang,
  labels,
}: Props) {
  return (
    <header className="pointer-events-auto absolute top-0 right-0 left-0 z-[400] border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <img src="/logo.svg" alt="" className="h-7 w-auto" />
      <select
        value={selectedType}
        onChange={(e) => onTypeChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
      >
        <option value="">{labels.allTypes}</option>
        {types.map((t) => (
          <option key={t.code} value={t.code}>{t.label}</option>
        ))}
      </select>
      <select
        value={selectedDivision}
        onChange={(e) => onDivisionChange(e.target.value)}
        className="max-w-[9rem] rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
      >
        <option value="">{labels.allDivisions}</option>
        {divisions.map((d) => (
          <option key={d.pcode} value={d.pcode}>{d.name}</option>
        ))}
      </select>
      <select
        value={selectedDistrict}
        onChange={(e) => onDistrictChange(e.target.value)}
        disabled={!selectedDivision || districtsLoading}
        className="max-w-[9rem] rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm disabled:opacity-50"
      >
        <option value="">{districtsLoading ? '…' : labels.allDistricts}</option>
        {districts.map((d) => (
          <option key={d.pcode} value={d.pcode}>{d.name}</option>
        ))}
      </select>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={labels.search}
        className="min-w-[120px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
      />
      {onStorytellerToggle && (
        <button
          type="button"
          onClick={onStorytellerToggle}
          title={storytellerPlaying ? labels.storytellerPause : labels.storytellerPlay}
          className="flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
        >
          {storytellerPlaying ? (
            <Pause className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {storytellerPlaying ? labels.storytellerPause : labels.storytellerPlay}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onLangToggle}
        className="rounded-md border border-cyan-500/40 px-2 py-1.5 text-xs font-semibold text-cyan-300"
      >
        {lang === 'en' ? labels.langBn : labels.langEn}
      </button>
    </div>
    {storytellerPlaying && storytellerProgress > 0 && (
      <div className="h-0.5 w-full bg-slate-800">
        <div
          className="h-full bg-cyan-500/80 transition-[width] duration-300"
          style={{ width: `${Math.min(100, storytellerProgress * 100)}%` }}
        />
      </div>
    )}
    </header>
  );
}

