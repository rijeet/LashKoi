import { z } from 'zod';

export const harvestMetaSchema = z.object({
  source: z.string().optional(),
  fetchedAt: z.string().optional(),
  extractor: z.string().optional(),
  matchedKeywords: z.array(z.string()).optional(),
  scope: z.enum(['event', 'aggregate', 'statement']).optional(),
  scores: z
    .object({
      relevance: z.number().optional(),
      geo: z.number().optional(),
    })
    .optional(),
  guessed: z
    .object({
      divisionPcode: z.string().optional(),
      districtPcode: z.string().optional(),
      upazilaPcode: z.string().optional(),
    })
    .optional(),
  needsReview: z.array(z.string()).optional(),
  clusterId: z.string().nullable().optional(),
});

export const candidateRowSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  externalId: z.string().optional(),
  type: z.string(),
  titleEn: z.string().nullable().optional(),
  titleBn: z.string().nullable().optional(),
  summaryEn: z.string().nullable().optional(),
  summaryBn: z.string().nullable().optional(),
  placeNameEn: z.string().nullable().optional(),
  placeNameBn: z.string().nullable().optional(),
  placeHint: z.string().nullable().optional(),
  caseCount: z.number().nullable().optional(),
  sourceLabel: z.string(),
  sourceUrl: z.string().url(),
  occurredAt: z.string(),
  _harvest: harvestMetaSchema.optional(),
});

export type CandidateRow = z.infer<typeof candidateRowSchema>;
