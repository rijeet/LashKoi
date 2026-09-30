import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DayPicker } from 'react-day-picker';
import { bn, enUS } from 'react-day-picker/locale';
import { CalendarDays, X } from 'lucide-react';
import { queryKeys } from '@/lib/query-keys';
import { getIncidentDays } from '@/services/get-incident-days';
import {
  formatDayLabel,
  firstDayOfNextMonth,
  parseDayString,
  todayInDhaka,
  toDayString,
} from '@/lib/dhaka-date';
import type { Lang } from '@/types/api';

type Props = {
  lang: Lang;
  types?: string;
  division?: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  labels: {
    allDates: string;
    today: string;
    clear: string;
    incidentsOnDay: string;
  };
};

export function MapDatePicker({
  lang,
  types,
  division,
  selectedDate,
  onDateChange,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() =>
    selectedDate ? parseDayString(selectedDate) : new Date(),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const before = firstDayOfNextMonth(month.getFullYear(), month.getMonth());

  const daysQuery = useQuery({
    queryKey: queryKeys.incidentDaysMonth(lang, types, division, monthKey),
    queryFn: () =>
      getIncidentDays(lang, types, division, { before, limit: 31 }),
    enabled: open,
    staleTime: 60_000,
  });

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of daysQuery.data ?? []) {
      if (row.date.startsWith(monthKey)) map.set(row.date, row.count);
    }
    return map;
  }, [daysQuery.data, monthKey]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (selectedDate) setMonth(parseDayString(selectedDate));
  }, [selectedDate]);

  const today = todayInDhaka();
  const buttonLabel = selectedDate
    ? formatDayLabel(selectedDate, lang)
    : labels.allDates;

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <div className="flex items-center gap-0.5 rounded-md border border-slate-700 bg-slate-900">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-sm text-slate-200"
          aria-expanded={open}
        >
          <CalendarDays
            className="h-3.5 w-3.5 shrink-0 text-cyan-400"
            aria-hidden
          />
          <span className="max-w-[9rem] truncate">{buttonLabel}</span>
        </button>
        {selectedDate ? (
          <button
            type="button"
            onClick={() => onDateChange('')}
            className="shrink-0 rounded-r-md border-l border-slate-700 px-1.5 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label={labels.clear}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          className="absolute top-full left-0 z-[500] mt-1 w-[min(100vw-1.5rem,20rem)] rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-xl"
          role="dialog"
          aria-label={labels.allDates}
        >
          <DayPicker
            mode="single"
            locale={lang === 'bn' ? bn : enUS}
            numerals={lang === 'bn' ? 'beng' : 'latn'}
            month={month}
            onMonthChange={setMonth}
            selected={selectedDate ? parseDayString(selectedDate) : undefined}
            onSelect={(d) => {
              if (d) {
                onDateChange(toDayString(d));
                setOpen(false);
              }
            }}
            disabled={(date) => toDayString(date) > today}
            modifiers={{
              hasIncidents: (date) => countByDate.has(toDayString(date)),
            }}
            modifiersClassNames={{
              hasIncidents: 'rdp-day_has-incidents',
            }}
            classNames={{
              root: 'lashkoi-rdp',
              months: 'flex flex-col',
              month: 'space-y-2',
              month_caption:
                'flex justify-center pb-1 text-sm font-medium text-slate-200',
              nav: 'flex items-center gap-1',
              button_previous:
                'rounded p-1 text-slate-300 hover:bg-slate-800',
              button_next: 'rounded p-1 text-slate-300 hover:bg-slate-800',
              weekdays: 'flex',
              weekday: 'w-9 text-center text-xs text-slate-500',
              week: 'flex',
              day: 'p-0 text-center',
              day_button:
                'mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm text-slate-200 hover:bg-slate-800',
              selected: 'bg-cyan-600 text-white hover:bg-cyan-600',
              disabled: 'text-slate-600 opacity-40',
              today: 'font-semibold text-cyan-300',
              outside: 'text-slate-600',
            }}
            components={{
              DayButton: ({ day, ...buttonProps }) => {
                const dateStr = toDayString(day.date);
                const count = countByDate.get(dateStr);
                const title =
                  count !== undefined
                    ? labels.incidentsOnDay.replace('{count}', String(count))
                    : undefined;
                return <button {...buttonProps} type="button" title={title} />;
              },
            }}
          />
          <div className="mt-2 flex gap-2 border-t border-slate-800 pt-2">
            <button
              type="button"
              className="flex-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900"
              onClick={() => {
                onDateChange(today);
                setOpen(false);
              }}
            >
              {labels.today}
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900"
              onClick={() => {
                onDateChange('');
                setOpen(false);
              }}
            >
              {labels.clear}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
