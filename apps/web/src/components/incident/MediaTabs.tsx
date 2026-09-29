import { Image, Youtube, Facebook } from 'lucide-react';

export type MediaTab = 'image' | 'youtube' | 'facebook';

type Props = {
  active: MediaTab;
  available: MediaTab[];
  onChange: (tab: MediaTab) => void;
};

const LABELS: Record<MediaTab, string> = {
  image: 'Image',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

export function MediaTabs({ active, available, onChange }: Props) {
  if (!available.length) return null;

  return (
    <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1.5">
      {available.map((tab) => {
        const isActive = tab === active;
        const Icon = tab === 'image' ? Image : tab === 'youtube' ? Youtube : Facebook;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
              isActive
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
