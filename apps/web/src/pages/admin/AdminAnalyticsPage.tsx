import { useQuery } from '@tanstack/react-query';
import { getAdminAnalytics } from '@/services/admin-analytics';

export function AdminAnalyticsPage() {
  const query = useQuery({
    queryKey: ['admin', 'analytics', 30],
    queryFn: () => getAdminAnalytics('en', 30),
  });

  if (query.isLoading) {
    return <p className="text-slate-400">Loading analytics…</p>;
  }
  if (query.isError || !query.data) {
    return <p className="text-red-400">Could not load analytics.</p>;
  }

  const data = query.data;
  const maxDivision = Math.max(...data.byDivision.map((r) => r.count), 1);
  const maxDay = Math.max(...data.byDay.map((r) => r.count), 1);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Analytics</h1>
      <p className="mb-6 text-sm text-slate-500">
        Published incidents in the last {data.days} days · updated{' '}
        {new Date(data.updatedAt).toLocaleString()}
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm text-slate-500">Total incidents</p>
          <p className="text-3xl font-semibold text-cyan-300">{data.total}</p>
        </div>
        {data.byType.map((row) => (
          <div
            key={row.code}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
          >
            <p className="text-sm text-slate-500">{row.label}</p>
            <p className="text-2xl font-semibold">{row.count}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">By division</h2>
        <ul className="space-y-2">
          {data.byDivision.map((row) => (
            <li key={row.pcode} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 truncate text-slate-300">{row.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-600"
                  style={{ width: `${(row.count / maxDivision) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-slate-400">
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Daily volume</h2>
        <div className="flex h-24 items-end gap-0.5 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          {data.byDay.map((row) => (
            <div
              key={row.date}
              className="min-w-0 flex-1 rounded-t bg-violet-600/80"
              style={{ height: `${Math.max(4, (row.count / maxDay) * 100)}%` }}
              title={`${row.date}: ${row.count}`}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Health cases by district (top 10)</h2>
        <ul className="space-y-2 text-sm">
          {data.healthDistrictsTop.map((row) => (
            <li
              key={row.pcode}
              className="flex justify-between rounded-md border border-slate-800 px-3 py-2"
            >
              <span>{row.name}</span>
              <span className="tabular-nums text-emerald-400">{row.total}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
