import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IncidentForm,
  adminRecordToForm,
  emptyIncidentForm,
  type IncidentFormState,
} from '@/components/admin/IncidentForm';
import {
  createAdminIncident,
  deleteAdminIncident,
  getAdminIncident,
  patchAdminIncident,
  publishAdminIncident,
  unpublishAdminIncident,
  getAdminIncidentAudit,
} from '@/services/admin-incidents';
import { queryKeys } from '@/lib/query-keys';
import { ApiError } from '@/services/api-client';

export function AdminIncidentNewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyIncidentForm);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => createAdminIncident(form),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: ['admin', 'incidents'] });
      navigate(`/admin/incidents/${record.id}`, { replace: true });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Save failed'),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">New incident</h1>
      {error && <p className="mb-3 text-red-400">{error}</p>}
      <IncidentForm value={form} onChange={setForm} disabled={save.isPending} />
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          disabled={save.isPending || !form.divisionPcode || !form.districtPcode}
          onClick={() => save.mutate()}
          className="rounded-md bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          Save draft
        </button>
        <Link to="/admin" className="px-4 py-2 text-slate-400 hover:text-white">
          Cancel
        </Link>
      </div>
    </div>
  );
}

export function AdminIncidentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<IncidentFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordQuery = useQuery({
    queryKey: queryKeys.adminIncident(id!),
    queryFn: () => getAdminIncident(id!),
    enabled: Boolean(id),
  });

  const auditQuery = useQuery({
    queryKey: ['admin', 'incidents', id, 'audit'],
    queryFn: () => getAdminIncidentAudit(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (recordQuery.data) setForm(adminRecordToForm(recordQuery.data));
  }, [recordQuery.data]);

  const save = useMutation({
    mutationFn: () => patchAdminIncident(id!, form!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminIncident(id!) });
      qc.invalidateQueries({ queryKey: ['admin', 'incidents'] });
      qc.invalidateQueries({ queryKey: ['admin', 'incidents', id, 'audit'] });
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Save failed'),
  });

  const publish = useMutation({
    mutationFn: () => publishAdminIncident(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminIncident(id!) });
      qc.invalidateQueries({ queryKey: ['admin', 'incidents'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['admin', 'incidents', id, 'audit'] });
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Publish failed'),
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishAdminIncident(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminIncident(id!) });
      qc.invalidateQueries({ queryKey: ['admin', 'incidents'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['admin', 'incidents', id, 'audit'] });
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Unpublish failed'),
  });

  const remove = useMutation({
    mutationFn: () => deleteAdminIncident(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'incidents'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      navigate('/admin', { replace: true });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  if (recordQuery.isLoading || !form) {
    return <p className="text-slate-400">Loading…</p>;
  }
  if (recordQuery.isError || !recordQuery.data) {
    return <p className="text-red-400">Incident not found.</p>;
  }

  const record = recordQuery.data;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-semibold">{record.refCode}</h1>
        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs capitalize">
          {record.status}
        </span>
        {record.status === 'published' && (
          <Link
            to={`/en/incidents/${record.slug}`}
            className="text-sm text-cyan-400 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Public page
          </Link>
        )}
      </div>
      {error && <p className="mb-3 text-red-400">{error}</p>}
      <IncidentForm
        value={form}
        onChange={setForm}
        disabled={save.isPending || publish.isPending}
      />
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate()}
          className="rounded-md border border-slate-600 px-4 py-2 hover:bg-slate-900 disabled:opacity-50"
        >
          Save changes
        </button>
        {record.status !== 'published' && (
          <button
            type="button"
            disabled={publish.isPending || record.locationConfirmed === false}
            title={
              record.locationConfirmed === false
                ? 'Set and save map location inside the district first'
                : undefined
            }
            onClick={() => publish.mutate()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Publish
          </button>
        )}
        {record.status === 'published' && (
          <button
            type="button"
            disabled={unpublish.isPending}
            onClick={() => unpublish.mutate()}
            className="rounded-md border border-amber-700 px-4 py-2 text-amber-200 hover:bg-amber-950 disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm('Delete this incident permanently from the admin list?')) {
              remove.mutate();
            }
          }}
          className="rounded-md border border-red-900 px-4 py-2 text-red-400 hover:bg-red-950 disabled:opacity-50"
        >
          Delete
        </button>
        <Link to="/admin" className="px-4 py-2 text-slate-400 hover:text-white">
          Back to list
        </Link>
      </div>

      <section className="mt-10 border-t border-slate-800 pt-6">
        <h2 className="mb-3 text-lg font-medium text-slate-200">Audit log</h2>
        {auditQuery.isLoading && (
          <p className="text-sm text-slate-500">Loading history…</p>
        )}
        {auditQuery.data?.length === 0 && (
          <p className="text-sm text-slate-500">No audit entries yet.</p>
        )}
        {auditQuery.data && auditQuery.data.length > 0 && (
          <ul className="space-y-2 text-sm">
            {auditQuery.data.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium capitalize text-cyan-300">
                    {entry.action}
                  </span>
                  <time className="text-slate-500" dateTime={entry.at}>
                    {new Date(entry.at).toLocaleString()}
                  </time>
                  {entry.user?.email && (
                    <span className="text-slate-400">{entry.user.email}</span>
                  )}
                </div>
                {entry.diff && Object.keys(entry.diff).length > 0 && (
                  <pre className="mt-2 max-h-40 overflow-auto text-xs text-slate-500">
                    {JSON.stringify(entry.diff, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
