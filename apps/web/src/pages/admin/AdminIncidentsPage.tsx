import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { listAdminIncidents } from '@/services/admin-incidents';
import { queryKeys } from '@/lib/query-keys';

export function AdminIncidentsPage() {
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const locationConfirmed = params.get('locationConfirmed') ?? '';

  const listQuery = useQuery({
    queryKey: queryKeys.adminIncidents({ q, status, locationConfirmed }),
    queryFn: () =>
      listAdminIncidents({
        q: q || undefined,
        status: status || undefined,
        locationConfirmed: locationConfirmed || undefined,
      }),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h1 className="flex-1 text-2xl font-semibold">Incidents</h1>
        <Link
          to="/admin/incidents/import"
          className="rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-900"
        >
          Bulk import
        </Link>
        <Link
          to="/admin/incidents/new"
          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
        >
          New draft
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search title, ref, slug…"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <Link
          to={locationConfirmed === 'false' ? '/admin' : '/admin?locationConfirmed=false'}
          className={`rounded-md border px-3 py-2 text-sm ${
            locationConfirmed === 'false'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-slate-700 text-slate-300'
          }`}
        >
          Needs location
        </Link>
      </div>

      {listQuery.isError && (
        <p className="text-red-400">Could not load incidents.</p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(listQuery.data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                <td className="px-3 py-2 font-mono text-xs text-cyan-400">
                  <Link to={`/admin/incidents/${row.id}`}>{row.refCode}</Link>
                </td>
                <td className="px-3 py-2">{row.titleEn}</td>
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2 capitalize">{row.status}</td>
                <td className="px-3 py-2">
                  {row.locationConfirmed === false ? (
                    <span className="text-amber-400">Needs map</span>
                  ) : (
                    <span className="text-slate-500">OK</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {new Date(row.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!listQuery.isLoading && listQuery.data?.items.length === 0 && (
          <p className="p-4 text-slate-500">No incidents yet.</p>
        )}
      </div>
      {listQuery.data && (
        <p className="mt-2 text-xs text-slate-500">
          {listQuery.data.total} total · page {listQuery.data.page}
        </p>
      )}
    </div>
  );
}
