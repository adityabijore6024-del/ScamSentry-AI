import { z } from 'zod';
import { db, type PersistedInvestigationCase } from '../db/database.ts';

export const GetInvestigationInputSchema = z.object({
  authToken: z.string().optional(),
  caseId: z.string().min(1, 'caseId is required'),
});

export type GetInvestigationInput = z.infer<typeof GetInvestigationInputSchema>;

export interface GetInvestigationOutput {
  found: boolean;
  caseRecord: PersistedInvestigationCase | null;
  error?: string;
}

export function getInvestigation(input: GetInvestigationInput): GetInvestigationOutput {
  const record = db.getCase(input.caseId);
  if (!record) {
    return {
      found: false,
      caseRecord: null,
      error: `Investigation case with ID '${input.caseId}' was not found in persistence store.`
    };
  }

  return {
    found: true,
    caseRecord: record
  };
}
