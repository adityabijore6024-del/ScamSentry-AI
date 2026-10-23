import { z } from 'zod';
import { db, type PersistedInvestigationCase } from '../db/database.ts';

export const SaveInvestigationInputSchema = z.object({
  authToken: z.string().optional(),
  id: z.string().optional(),
  title: z.string().optional(),
  messageText: z.string().min(1, 'Message text is required'),
  submittedUrl: z.string().nullable().optional(),
  claimedOrganization: z.string().nullable().optional(),
  riskLevel: z.enum(['LOW', 'ELEVATED', 'HIGH', 'CRITICAL']),
  riskScore: z.number().min(0).max(100),
  evidenceStrength: z.string().default('MODERATE'),
  assessment: z.any(),
  safetyPlan: z.any(),
  toolsExecuted: z.array(z.string()).default([]),
});

export type SaveInvestigationInput = z.infer<typeof SaveInvestigationInputSchema>;

export interface SaveInvestigationOutput {
  caseId: string;
  createdAt: string;
  verificationHash: string;
  title: string;
  persisted: boolean;
}

export function saveInvestigation(input: SaveInvestigationInput): SaveInvestigationOutput {
  const saved = db.createCase({
    id: input.id,
    title: input.title,
    messageText: input.messageText,
    submittedUrl: input.submittedUrl,
    claimedOrganization: input.claimedOrganization,
    riskLevel: input.riskLevel,
    riskScore: input.riskScore,
    evidenceStrength: input.evidenceStrength,
    assessment: input.assessment,
    safetyPlan: input.safetyPlan,
    toolsExecuted: input.toolsExecuted,
  });

  return {
    caseId: saved.id,
    createdAt: saved.createdAt,
    verificationHash: saved.verificationHash,
    title: saved.title,
    persisted: true,
  };
}
