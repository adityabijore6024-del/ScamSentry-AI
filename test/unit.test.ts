import { test, describe } from 'node:test';
import assert from 'node:assert';
import { analyzeMessageHeuristic } from '../server/tools/analyzeMessage.ts';
import { inspectUrl } from '../server/tools/inspectUrl.ts';
import { assessEvidence } from '../server/tools/assessEvidence.ts';
import { createSafetyPlan } from '../server/tools/createSafetyPlan.ts';
import { prepareIncidentReport } from '../server/tools/prepareIncidentReport.ts';

describe('Unit Tests — ScamSentry Investigation Engine', () => {
  test('analyzeMessageHeuristic extracts payment demands and credentials', () => {
    const text = 'Urgent: Your Amazon account is locked. Provide your OTP and pay $50 via Zelle immediately.';
    const result = analyzeMessageHeuristic(text);

    assert.ok(result.extractedUrls.length === 0);
    assert.strictEqual(result.claimedOrganization, 'Amazon');
    assert.ok(result.paymentDemands.includes('zelle'));
    assert.ok(result.credentialRequests.includes('otp'));
    assert.ok(result.urgencySignals.includes('urgent') || result.urgencySignals.includes('immediately'));
    assert.strictEqual(result.analysisSource, 'HEURISTIC_ANALYSIS');
  });

  test('inspectUrl detects lookalike domains and deceptive subdomains', () => {
    const deceptiveUrl = 'https://paypal.com.verification-security-portal.xyz/login';
    const result = inspectUrl(deceptiveUrl);

    assert.strictEqual(result.hasDeceptiveSubdomain, true);
    assert.strictEqual(result.lookalikeTarget, 'PayPal');
    assert.strictEqual(result.suspiciousTld, true);
    assert.ok(result.observableEvidence.length > 0);
    assert.strictEqual(result.reputationCheck.performed, false, 'Should not fetch external network without explicit configuration');
  });

  test('inspectUrl detects raw IP addresses and non-standard ports', () => {
    const ipUrl = 'http://192.168.1.100:8080/secure';
    const result = inspectUrl(ipUrl);

    assert.strictEqual(result.isIpAddress, true);
    assert.strictEqual(result.hasUnusualPort, true);
    assert.strictEqual(result.scheme, 'http');
  });

  test('assessEvidence computes high risk for combined credential and payment demands', () => {
    const messageAnalysis = analyzeMessageHeuristic('Send $100 via Zelle and give me your password now!');
    const urlResult = inspectUrl('https://paypa1-account.top');
    const assessment = assessEvidence(messageAnalysis, [urlResult]);

    assert.ok(assessment.riskScore >= 50, `Score was ${assessment.riskScore}, expected >= 50`);
    assert.ok(assessment.overallRiskLevel === 'HIGH' || assessment.overallRiskLevel === 'CRITICAL');
    assert.ok(assessment.supportingIndicators.length >= 2);
    assert.ok(assessment.scoringMethodology.includes('Composite Weighted Heuristic Index'));
  });

  test('createSafetyPlan generates appropriate directives', () => {
    const plan = createSafetyPlan('CRITICAL', true, true, 'PayPal');
    assert.ok(plan.primaryDirective.includes('DO NOT'));
    assert.ok(plan.actionItems.some(i => i.title.includes('One-Time Passwords')));
    assert.ok(plan.officialReportingPortals.length >= 3);
  });

  test('prepareIncidentReport escapes HTML entities to prevent XSS', () => {
    const mockAssessment = assessEvidence(analyzeMessageHeuristic('Normal text'));
    const mockSafety = createSafetyPlan('LOW', false, false, null);
    const report = prepareIncidentReport(
      'CASE-XSS-TEST',
      '<script>alert("xss")</script>',
      'https://example.com?q=<script>',
      mockAssessment,
      mockSafety,
      '<b>Evil Org</b>'
    );

    assert.ok(!report.sanitizedHtmlContent.includes('<script>alert("xss")</script>'));
    assert.ok(report.sanitizedHtmlContent.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
    assert.ok(report.sanitizedHtmlContent.includes('&lt;b&gt;Evil Org&lt;/b&gt;'));
    assert.ok(report.reportId.startsWith('REP-'));
  });
});
