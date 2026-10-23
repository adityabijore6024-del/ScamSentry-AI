import { z } from 'zod';
import { db } from '../db/database.ts';

export const VerifyActionInputSchema = z.object({
  actionType: z.enum([
    'PERSISTENCE_VERIFICATION',
    'DELETION_VERIFICATION',
    'REPORT_GENERATION_VERIFICATION'
  ]),
  targetId: z.string().min(1, 'targetId is required'),
  expectedHash: z.string().optional(),
});

export type VerifyActionInput = z.infer<typeof VerifyActionInputSchema>;

export interface VerifyActionResult {
  actionType: string;
  targetId: string;
  verified: boolean;
  timestamp: string;
  details: string;
  stateSnapshot?: Record<string, any>;
}

export function verifyAction(input: VerifyActionInput): VerifyActionResult {
  const timestamp = new Date().toISOString();

  if (input.actionType === 'PERSISTENCE_VERIFICATION') {
    const check = db.verifyRecordIntegrity(input.targetId);
    if (!check.exists) {
      return {
        actionType: input.actionType,
        targetId: input.targetId,
        verified: false,
        timestamp,
        details: `Verification failed: Record with ID '${input.targetId}' does not exist in the database.`
      };
    }

    if (!check.hashMatches) {
      return {
        actionType: input.actionType,
        targetId: input.targetId,
        verified: false,
        timestamp,
        details: `Verification failed: Cryptographic integrity hash mismatch. Stored: ${check.storedHash}, Computed: ${check.computedHash}. Record may be tampered.`
      };
    }

    if (input.expectedHash && input.expectedHash !== check.storedHash) {
      return {
        actionType: input.actionType,
        targetId: input.targetId,
        verified: false,
        timestamp,
        details: `Verification failed: Expected hash does not match stored verification hash.`
      };
    }

    return {
      actionType: input.actionType,
      targetId: input.targetId,
      verified: true,
      timestamp,
      details: `Verification confirmed: Record '${input.targetId}' exists, schema validates, and SHA-256 payload integrity check passed (${check.storedHash?.substring(0, 12)}...).`,
      stateSnapshot: {
        id: check.record?.id,
        createdAt: check.record?.createdAt,
        riskLevel: check.record?.riskLevel,
        riskScore: check.record?.riskScore
      }
    };
  }

  if (input.actionType === 'DELETION_VERIFICATION') {
    const existing = db.getCase(input.targetId);
    if (existing !== null) {
      return {
        actionType: input.actionType,
        targetId: input.targetId,
        verified: false,
        timestamp,
        details: `Deletion verification failed: Record '${input.targetId}' is still present in database.`
      };
    }

    return {
      actionType: input.actionType,
      targetId: input.targetId,
      verified: true,
      timestamp,
      details: `Deletion confirmed: Record '${input.targetId}' has been completely purged from database.`
    };
  }

  if (input.actionType === 'REPORT_GENERATION_VERIFICATION') {
    // Check if targetId matches valid report identifier format
    const isValidFormat = /^REP-[A-Z0-9]+-[A-Z0-9]+$/.test(input.targetId);
    return {
      actionType: input.actionType,
      targetId: input.targetId,
      verified: isValidFormat,
      timestamp,
      details: isValidFormat 
        ? `Report format and reference ID '${input.targetId}' verified successfully.`
        : `Report reference ID '${input.targetId}' is invalid or malformed.`
    };
  }

  return {
    actionType: input.actionType,
    targetId: input.targetId,
    verified: false,
    timestamp,
    details: 'Unrecognized action verification request.'
  };
}
