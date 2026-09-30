import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '@/services/api-client';
import {
  bulkImportIncidents,
  normalizeBulkImport,
  type BulkImportResult,
  type NormalizeRow,
} from '@/services/admin-bulk-import';

type FileMeta = {
  raw: string;
  format: 'json' | 'jsonl';
  fileName: string;
};

function needsReviewTags(row: Record<string, unknown> | undefined): string[] {
  const fromRow = row?.needsReview;
  if (Array.isArray(fromRow)) return fromRow.map(String);
  const harvest = row?._harvest as { needsReview?: string[] } | undefined;
  return harvest?.needsReview ?? [];
}

export function AdminBulkImportPage() {
  const [profile, setProfile] = useState('');
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [preview, setPreview] = useState<{
    detectedProfile: string;
    rows: NormalizeRow[];
    summary: { total: number; ok: number; failed: number };
  } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchId, setBatchId] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File) => {
    setError('');
    setBatchId(null);
    setImportSummary(null);
    const raw = await file.text();
    const format = file.name.endsWith('.jsonl') ? 'jsonl' : 'json';
    setFileMeta({ raw, format, fileName: file.name });
    setLoading(true);
    try {
      const data = await normalizeBulkImport({
        raw,
        format,
        profile: profile || undefined,
      });
      setPreview(data);
      setSelected(
        new Set(
          data.rows
            .filter((r: NormalizeRow) => r.ok)
            .map((r: NormalizeRow) => r.index),
        ),
      );
    } catch (e: unknown) {
      setPreview(null);
      setError(
        e instanceof ApiError
          ? e.message
          : 'Normalize failed. Check file format and API (bulk import enabled locally).',
      );
    } finally {
      setLoading(false);
    }
  };

  const onImport = async () => {
    if (!preview || !fileMeta || selected.size === 0) return;
    setLoading(true);
    setError('');
    setImportSummary(null);
    const indices = [...selected];
    const payload = {
      raw: fileMeta.raw,
      format: fileMeta.format,
      profile: profile || undefined,
      indices,
      fileName: fileMeta.fileName,
      source: 'ui' as const,
    };
    try {
      const dry = await bulkImportIncidents({ ...payload, dryRun: true });
      if (dry.errors.length > 0) {
        setError(
          `Dry-run: ${dry.errors.length} row(s) would fail. First: ${dry.errors[0].message}`,
        );
        return;
      }
      const result = await bulkImportIncidents({ ...payload, dryRun: false });
      if (result.batchId) setBatchId(result.batchId);
      setImportSummary(
        `Created ${result.created.length}, skipped ${result.skipped.length}, errors ${result.errors.length}.`,
      );
      if (result.errors.length > 0) {
        setError(
          result.errors
            .map((err: BulkImportResult['errors'][number]) => err.message)
            .join('; '),
        );
      }
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : 'Import failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Bulk import</h1>
        <Link to="/admin" className="text-sm text-cyan-400 hover:underline">
          ← Incidents
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Upload harvest JSON or JSONL. Rows import as <strong>drafts</strong>. Set
        division, district, and map pin in the incident editor before publish.
        Location is not set from the file.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="file"
          accept=".json,.jsonl,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
          className="text-sm"
        />
        <input
          type="text"
          placeholder="Profile override (optional)"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
        />
      </div>
      {loading && <p className="text-slate-400">Working…</p>}
      {error && <p className="mb-2 text-red-400">{error}</p>}
      {importSummary && !error && (
        <p className="mb-2 text-sm text-emerald-400">{importSummary}</p>
      )}
      {preview && (
        <>
          <p className="mb-2 text-sm text-slate-400">
            Profile: <span className="text-slate-200">{preview.detectedProfile}</span>
            {' · '}
            {preview.summary.ok} / {preview.summary.total} valid
            {fileMeta ? ` · ${fileMeta.fileName}` : ''}
          </p>
          <div className="mb-4 max-h-96 overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-2 py-1">✓</th>
                  <th className="px-2 py-1">Title</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Place</th>
                  <th className="px-2 py-1">Review</th>
                  <th className="px-2 py-1">Source</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => {
                  const title = r.ok
                    ? String(r.row?.titleEn ?? r.row?.titleBn ?? '—')
                    : r.errors.join('; ') || 'Invalid row';
                  const tags = needsReviewTags(r.row);
                  if (!r.ok && r.warnings.length) {
                    tags.push(...r.warnings);
                  }
                  return (
                    <tr
                      key={r.index}
                      className={`border-t border-slate-800 ${r.ok ? '' : 'bg-red-950/20'}`}
                    >
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          disabled={!r.ok}
                          checked={selected.has(r.index)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(r.index);
                            else next.delete(r.index);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="max-w-[14rem] truncate px-2 py-1" title={title}>
                        {title}
                      </td>
                      <td className="px-2 py-1">{String(r.row?.type ?? '—')}</td>
                      <td className="px-2 py-1">
                        {String(r.row?.placeNameEn ?? r.row?.placeNameBn ?? '—')}
                      </td>
                      <td className="px-2 py-1 text-xs text-amber-400/90">
                        {tags.length ? tags.join(', ') : '—'}
                      </td>
                      <td className="px-2 py-1">
                        {r.row?.sourceUrl ? (
                          <a
                            href={String(r.row.sourceUrl)}
                            className="text-cyan-400 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            link
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={loading || selected.size === 0 || !fileMeta}
            onClick={() => void onImport()}
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Import {selected.size} as drafts
          </button>
        </>
      )}
      {batchId && (
        <p className="mt-4 text-sm text-emerald-400">
          Batch {batchId}.{' '}
          <Link to="/admin?locationConfirmed=false" className="underline">
            Review drafts needing location
          </Link>
        </p>
      )}
    </div>
  );
}
