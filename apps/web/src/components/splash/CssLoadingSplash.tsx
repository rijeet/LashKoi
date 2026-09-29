import type { StatsSummaryDto } from '@/types/api';

type Props = {
  tag: string;
  statusText: string;
  progress: number;
  stats: StatsSummaryDto | null;
  ready: boolean;
  onEnter: () => void;
  onSkip: () => void;
  enterLabel: string;
  skipLabel: string;
};

export function CssLoadingSplash({
  tag,
  statusText,
  progress,
  stats,
  ready,
  onEnter,
  onSkip,
  enterLabel,
  skipLabel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
      <button
        type="button"
        onClick={onSkip}
        className="absolute top-4 right-4 text-sm text-slate-400 underline hover:text-slate-200"
      >
        {skipLabel}
      </button>
      <div className="w-full max-w-md px-6 text-center">
        <img src="/logo.svg" alt="LashKoi" className="mx-auto h-8 w-auto" />
        <p className="mt-2 text-[0.65rem] uppercase tracking-[0.2em] text-cyan-400">{tag}</p>
        <div
          className="mx-auto mt-8 h-12 w-12 animate-spin rounded-full border-[3px] border-cyan-400/20 border-t-cyan-400"
          aria-hidden
        />
        <p className="mt-5 min-h-5 text-sm text-slate-400">{statusText}</p>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {stats && (
          <ul className="mt-6 space-y-1 text-left text-xs text-slate-400">
            {stats.byType.map((row) => (
              <li key={row.code}>
                <span className="font-medium text-slate-200">{row.label}</span>:{' '}
                {row.count.toLocaleString()}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={!ready}
          onClick={onEnter}
          className={`mt-8 border-2 border-cyan-400/50 px-6 py-3 text-xs font-semibold uppercase tracking-wider transition ${
            ready
              ? 'animate-pulse cursor-pointer opacity-100'
              : 'cursor-not-allowed opacity-40'
          }`}
        >
          {enterLabel}
        </button>
      </div>
    </div>
  );
}
