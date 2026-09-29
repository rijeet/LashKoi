import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminBanner,
  deleteAdminBanner,
  listAdminBanners,
  patchAdminBanner,
  type BannerFormBody,
} from '@/services/admin-banners';
import { ApiError } from '@/services/api-client';

const emptyForm: BannerFormBody = {
  imageUrl: '',
  captionEn: '',
  captionBn: '',
  sectionType: 'breaking',
  sortOrder: 0,
  isActive: true,
  incidentId: null,
  startsAt: null,
  endsAt: null,
};

export function AdminBannersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<BannerFormBody>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: listAdminBanners,
  });

  const create = useMutation({
    mutationFn: () => createAdminBanner(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      setForm(emptyForm);
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Create failed'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchAdminBanner(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminBanner(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
    },
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Featured banners</h1>
      <p className="mb-6 text-sm text-slate-400">
        Breaking / featured strips on splash and map. Schedule with start/end (optional).
      </p>

      {error && <p className="mb-3 text-red-400">{error}</p>}

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">New banner</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Image URL
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Caption (EN)
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
              value={form.captionEn ?? ''}
              onChange={(e) => setForm({ ...form, captionEn: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Caption (BN)
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
              value={form.captionBn ?? ''}
              onChange={(e) => setForm({ ...form, captionBn: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Section
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
              value={form.sectionType}
              onChange={(e) => setForm({ ...form, sectionType: e.target.value })}
            >
              <option value="breaking">breaking</option>
              <option value="featured">featured</option>
            </select>
          </label>
          <label className="block text-sm">
            Sort order
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
              value={form.sortOrder ?? 0}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!form.imageUrl || create.isPending}
          onClick={() => create.mutate()}
          className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          Add banner
        </button>
      </section>

      {listQuery.isLoading && <p className="text-slate-400">Loading…</p>}
      {listQuery.data?.length === 0 && (
        <p className="text-slate-500">No banners yet.</p>
      )}
      <ul className="space-y-3">
        {listQuery.data?.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 p-3"
          >
            <img
              src={b.imageUrl}
              alt=""
              className="h-14 w-24 rounded object-cover bg-slate-800"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-200">{b.captionEn ?? '—'}</p>
              <p className="text-xs text-slate-500">
                {b.sectionType} · order {b.sortOrder}
                {b.incidentSlug ? ` · ${b.incidentSlug}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="rounded border border-slate-600 px-2 py-1 text-xs"
              onClick={() =>
                toggleActive.mutate({ id: b.id, isActive: !b.isActive })
              }
            >
              {b.isActive ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              className="rounded border border-red-900 px-2 py-1 text-xs text-red-400"
              onClick={() => {
                if (window.confirm('Delete this banner?')) remove.mutate(b.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
