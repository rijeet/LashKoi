import { apiRequest } from '@/services/api-client';

export type NormalizeRow = {
  index: number;
  ok: boolean;
  row?: Record<string, unknown>;
  mapped: Record<string, string>;
  warnings: string[];
  errors: string[];
  unmappedKeys: string[];
};

export type NormalizeResult = {
  detectedProfile: string;
  confidence: number;
  rows: NormalizeRow[];
  summary: { total: number; ok: number; failed: number };
};

export type BulkImportResult = {
  batchId: string | null;
  dryRun: boolean;
  detectedProfile?: string;
  summary?: { total: number; ok: number; failed: number };
  created: Array<{ index: number; id: string; externalId: string }>;
  skipped: Array<{ index: number; externalId: string; reason: string }>;
  errors: Array<{
    index: number;
    externalId?: string;
    code: string;
    message: string;
  }>;
};

export function normalizeBulkImport(body: {
  raw?: string;
  format?: 'json' | 'jsonl';
  incidents?: Record<string, unknown>[];
  profile?: string;
}) {
  return apiRequest<NormalizeResult>('/admin/incidents/bulk/normalize', {
    method: 'POST',
    auth: true,
    body,
  });
}

export function bulkImportIncidents(body: {
  raw?: string;
  format?: 'json' | 'jsonl';
  incidents?: Record<string, unknown>[];
  profile?: string;
  indices?: number[];
  source?: 'ui' | 'cli';
  fileName?: string;
  dryRun?: boolean;
}) {
  return apiRequest<BulkImportResult>('/admin/incidents/bulk', {
    method: 'POST',
    auth: true,
    query: body.dryRun ? { dryRun: 'true' } : undefined,
    body: {
      raw: body.raw,
      format: body.format,
      incidents: body.incidents,
      profile: body.profile,
      indices: body.indices,
      source: body.source ?? 'ui',
      fileName: body.fileName,
    },
  });
}
