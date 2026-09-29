import type { Lang } from '@/types/api';

type Props = {
  lang: Lang;
  typeLabel: string;
  accentColor: string;
  maxTotal: number;
  days: number;
};

const copy = {
  en: (days: number, type: string) =>
    `District cases (${type}) — last ${days} days`,
  bn: (days: number, type: string) =>
    `জেলা ভিত্তিক (${type}) — গত ${days} দিন`,
};

export function HealthChoroplethLegend({
  lang,
  typeLabel,
  accentColor,
  maxTotal,
  days,
}: Props) {
  if (maxTotal <= 0) return null;
  const title = (lang === 'bn' ? copy.bn : copy.en)(days, typeLabel);
  return (
    <div
      className="pointer-events-none absolute bottom-20 left-3 z-[350] max-w-[11rem] rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-300 shadow-lg backdrop-blur-sm"
      aria-hidden
    >
      <p className="mb-2 font-medium text-slate-200">{title}</p>
      <div
        className="h-2 w-full rounded-full"
        style={{
          background: `linear-gradient(90deg, #0f172a 0%, ${accentColor} 100%)`,
        }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>0</span>
        <span>{maxTotal}</span>
      </div>
    </div>
  );
}
