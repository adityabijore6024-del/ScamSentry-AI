import { test, describe } from 'node:test';
import assert from 'node:assert';
import { db } from '../server/db/database.ts';

describe('Database Persistence & Integrity Tests', () => {
  const testCaseId = `CASE-TEST-${Date.now()}`;

  test('createCase persists an investigation with SHA-256 verification hash', () => {
    const saved = db.createCase({
      id: testCaseId,
      messageText: 'Test phishing notification from courier fake office',
      submittedUrl: 'http://courier-fee.top',
      claimedOrganization: 'FedEx',
      riskLevel: 'HIGH',
      riskScore: 70,
      evidenceStrength: 'STRONG',
      assessment: { test: true },
      safetyPlan: { directive: 'Do not pay' },
      toolsExecuted: ['analyze_message', 'inspect_url', 'assess_evidence']
    });

    assert.strictEqual(saved.id, testCaseId);
    assert.strictEqual(saved.riskLevel, 'HIGH');
    assert.ok(saved.verificationHash.length === 64, 'SHA-256 hash must be 64 hexadecimal characters');
  });

  test('getCase retrieves the exact stored record', () => {
    const retrieved = db.getCase(testCaseId);
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved.claimedOrganization, 'FedEx');
    assert.strictEqual(retrieved.riskScore, 70);
  });

  test('verifyRecordIntegrity validates cryptographic payload hash', () => {
    const integrity = db.verifyRecordIntegrity(testCaseId);
    assert.strictEqual(integrity.verified, true);
    assert.strictEqual(integrity.exists, true);
    assert.strictEqual(integrity.hashMatches, true);
  });

  test('listCases filters by risk level and search keyword', () => {
    const searchRes = db.listCases({ search: 'FedEx' });
    assert.ok(searchRes.cases.some(c => c.id === testCaseId));

    const filterRes = db.listCases({ riskLevel: 'HIGH' });
    assert.ok(filterRes.cases.some(c => c.id === testCaseId));

    const mismatchRes = db.listCases({ riskLevel: 'LOW' });
    assert.ok(!mismatchRes.cases.some(c => c.id === testCaseId));
  });

  test('deleteCase purges the record and verifies deletion', () => {
    const deleted = db.deleteCase(testCaseId);
    assert.strictEqual(deleted, true);

    const postCheck = db.getCase(testCaseId);
    assert.strictEqual(postCheck, null);

    const integrityPost = db.verifyRecordIntegrity(testCaseId);
    assert.strictEqual(integrityPost.exists, false);
    assert.strictEqual(integrityPost.verified, false);
  });
});
