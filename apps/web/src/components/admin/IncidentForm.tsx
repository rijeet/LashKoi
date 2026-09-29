import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GeoCascadeSelect } from '@/components/admin/GeoCascadeSelect';
import { MediaUrlFields } from '@/components/admin/MediaUrlFields';
import { getIncidentTypes } from '@/services/get-incident-types';
import type { AdminIncidentDto } from '@/types/api';
import type { CreateIncidentBody } from '@/services/admin-incidents';
import { BD_CENTER } from '@/lib/constants';

const MapPointPicker = lazy(() =>
  import('@/components/admin/MapPointPicker').then((m) => ({ default: m.MapPointPicker })),
);

export type IncidentFormState = CreateIncidentBody;

export function emptyIncidentForm(): IncidentFormState {
  return {
    type: 'extortion',
    titleEn: '',
    titleBn: '',
    summaryEn: '',
    summaryBn: '',
    bodyHtml: '',
    placeNameEn: '',
    placeNameBn: '',
    location: { lat: BD_CENTER[0], lng: BD_CENTER[1] },
    divisionPcode: '',
    districtPcode: '',
    upazilaPcode: null,
    unionPcode: null,
    sourceLabel: '',
    sourceUrl: '',
    occurredAt: new Date().toISOString(),
    bannerCaptionEn: '',
    bannerCaptionBn: null,
    caseCount: null,
    media: {},
  };
}

export function adminRecordToForm(record: AdminIncidentDto): IncidentFormState {
  return {
    type: record.type,
    titleEn: record.titleEn,
    titleBn: record.titleBn ?? '',
    summaryEn: record.summaryEn,
    summaryBn: record.summaryBn ?? '',
    bodyHtml: record.bodyHtml ?? '',
    placeNameEn: record.placeNameEn ?? '',
    placeNameBn: record.placeNameBn ?? '',
    location: record.location ?? { lat: BD_CENTER[0], lng: BD_CENTER[1] },
    divisionPcode: record.divisionPcode,
    districtPcode: record.districtPcode,
    upazilaPcode: record.upazilaPcode,
    unionPcode: record.unionPcode,
    sourceLabel: record.sourceLabel,
    sourceUrl: record.sourceUrl ?? '',
    occurredAt: record.occurredAt,
    bannerCaptionEn: record.bannerCaptionEn ?? '',
    bannerCaptionBn: record.bannerCaptionBn,
    caseCount: record.caseCount,
    media: { ...record.media },
  };
}

type Props = {
  value: IncidentFormState;
  onChange: (next: IncidentFormState) => void;
  disabled?: boolean;
};

export function IncidentForm({ value, onChange, disabled }: Props) {
  const types = useQuery({
    queryKey: ['incident-types', 'en'],
    queryFn: () => getIncidentTypes('en'),
    staleTime: 3600_000,
  });
  const [showPreview, setShowPreview] = useState(false);

  const patch = (partial: Partial<IncidentFormState>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-6">
      <label className="block text-sm">
        <span className="text-slate-400">Type</span>
        <select
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
          value={value.type}
          disabled={disabled}
          onChange={(e) => patch({ type: e.target.value })}
        >
          {(types.data ?? []).map((t) => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-400">Title (EN)</span>
          <input
            required
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.titleEn}
            disabled={disabled}
            onChange={(e) => patch({ titleEn: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Title (BN)</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.titleBn ?? ''}
            disabled={disabled}
            onChange={(e) => patch({ titleBn: e.target.value })}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-400">Summary (EN)</span>
          <textarea
            required
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.summaryEn}
            disabled={disabled}
            onChange={(e) => patch({ summaryEn: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Summary (BN)</span>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.summaryBn ?? ''}
            disabled={disabled}
            onChange={(e) => patch({ summaryBn: e.target.value })}
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-400">Body HTML</span>
          <button
            type="button"
            className="text-xs text-cyan-400"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {showPreview ? (
          <div
            className="prose prose-invert max-w-none rounded-md border border-slate-800 bg-slate-900 p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: value.bodyHtml ?? '' }}
          />
        ) : (
          <textarea
            rows={6}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 font-mono text-sm"
            value={value.bodyHtml ?? ''}
            disabled={disabled}
            onChange={(e) => patch({ bodyHtml: e.target.value })}
          />
        )}
      </div>

      <GeoCascadeSelect
        lang="en"
        divisionPcode={value.divisionPcode}
        districtPcode={value.districtPcode}
        upazilaPcode={value.upazilaPcode ?? ''}
        onChange={(geo) =>
          patch({
            divisionPcode: geo.divisionPcode,
            districtPcode: geo.districtPcode,
            upazilaPcode: geo.upazilaPcode || null,
          })
        }
      />

      <Suspense fallback={<p className="text-sm text-slate-500">Loading map…</p>}>
        <MapPointPicker
          lat={value.location.lat}
          lng={value.location.lng}
          onPick={(lat, lng) => patch({ location: { lat, lng } })}
        />
      </Suspense>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-400">Place name (EN)</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.placeNameEn ?? ''}
            disabled={disabled}
            onChange={(e) => patch({ placeNameEn: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Occurred at</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.occurredAt.slice(0, 16)}
            disabled={disabled}
            onChange={(e) =>
              patch({ occurredAt: new Date(e.target.value).toISOString() })
            }
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-400">Source label</span>
          <input
            required
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.sourceLabel}
            disabled={disabled}
            onChange={(e) => patch({ sourceLabel: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Source URL</span>
          <input
            type="url"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
            value={value.sourceUrl ?? ''}
            disabled={disabled}
            onChange={(e) => patch({ sourceUrl: e.target.value })}
          />
        </label>
      </div>

      <MediaUrlFields
        value={value.media ?? {}}
        onChange={(media) => patch({ media })}
      />
    </div>
  );
}
