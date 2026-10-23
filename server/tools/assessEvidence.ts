import { z } from 'zod';
import type { AnalyzeMessageResult } from './analyzeMessage.ts';
import type { UrlInspectionResult } from './inspectUrl.ts';

export type RiskLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
export type EvidenceStrength = 'LIMITED' | 'MODERATE' | 'STRONG' | 'CONCLUSIVE';
export type UncertaintyLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface EvidenceAssessmentResult {
  overallRiskLevel: RiskLevel;
  riskScore: number;
  scoringMethodology: string;
  evidenceStrength: EvidenceStrength;
  uncertaintyLevel: UncertaintyLevel;
  uncertaintyReason: string;
  supportingIndicators: string[];
  contradictoryEvidence: string[];
  checksPerformed: string[];
  checksUnavailable: string[];
  limitations: string[];
  recommendedCategory: 'SAFE_TO_PROCEED' | 'PROCEED_WITH_CAUTION' | 'VERIFY_OFFICIALLY' | 'IMMEDIATE_AVOIDANCE';
}

export const AssessEvidenceInputSchema = z.object({
  messageAnalysis: z.any(),
  urlInspections: z.array(z.any()).default([]),
});

export function assessEvidence(
  messageAnalysis: AnalyzeMessageResult,
  urlInspections: UrlInspectionResult[] = []
): EvidenceAssessmentResult {
  const supportingIndicators: string[] = [];
  const contradictoryEvidence: string[] = [];
  const checksPerformed: string[] = [
    'Message linguistic structure and urgent pressure analysis',
    'Financial demand and unauthorized payment mechanism scan',
    'Credential, OTP, and sensitive identity extraction scan',
    'Impersonation indicator and claimed organization verification'
  ];
  const checksUnavailable: string[] = [
    'Live telephone carrier caller ID spoofing verification (carrier telemetry unavailable)',
    'Full email RFC 5322 DKIM/SPF/DMARC cryptographic validation (raw headers not provided)',
    'Live bank account ownership and receiver KYC validation'
  ];

  let rawScore = 5; // Baseline low risk

  // 1. Message-based signals
  if (messageAnalysis.credentialRequests.length > 0) {
    rawScore += 35;
    supportingIndicators.push(`Demands sensitive authentication tokens or credentials (${messageAnalysis.credentialRequests.join(', ')}). Legitimate services never ask users to verbally or textually disclose OTPs.`);
  }

  if (messageAnalysis.paymentDemands.length > 0) {
    rawScore += 30;
    supportingIndicators.push(`Requests non-standard or irreversible payment forms (${messageAnalysis.paymentDemands.join(', ')}), a primary indicator of advance-fee or refund fraud.`);
  }

  if (messageAnalysis.urgencySignals.length > 0) {
    rawScore += 15;
    supportingIndicators.push(`Uses psychological urgency/threat mechanisms (${messageAnalysis.urgencySignals.join(', ')}), designed to suppress rational verification.`);
  }

  if (messageAnalysis.impersonationIndicators.length > 0) {
    rawScore += 20;
    messageAnalysis.impersonationIndicators.forEach(ind => supportingIndicators.push(ind));
  }

  // 2. URL-based signals
  if (urlInspections.length > 0) {
    checksPerformed.push('RFC 3986 URL syntax and structural normalization');
    checksPerformed.push('Lookalike domain, deceptive subdomain, and typosquatting detection');
    checksPerformed.push('Direct IP address and embedded authentication credential scan');
    checksPerformed.push('High-risk top-level domain abuse evaluation');

    for (const urlRes of urlInspections) {
      if (urlRes.hasDeceptiveSubdomain || urlRes.isLookalikeDomain) {
        rawScore += 30;
        supportingIndicators.push(`URL '${urlRes.hostname}' exhibits deceptive brand spoofing targeting '${urlRes.lookalikeTarget || 'known brand'}'.`);
      }
      if (urlRes.isIpAddress) {
        rawScore += 25;
        supportingIndicators.push(`URL points to an exposed raw IP address (${urlRes.hostname}) rather than a legitimate domain.`);
      }
      if (urlRes.hasEmbeddedCredentials) {
        rawScore += 20;
        supportingIndicators.push(`URL embeds explicit user authentication parameters in the authority component.`);
      }
      if (urlRes.hasUnusualPort) {
        rawScore += 15;
        supportingIndicators.push(`URL connects over non-standard port :${urlRes.port}.`);
      }
      if (urlRes.suspiciousTld) {
        rawScore += 15;
        supportingIndicators.push(`URL uses high-abuse top level domain.`);
      }
      if (urlRes.scheme === 'http') {
        rawScore += 10;
        supportingIndicators.push(`URL transmits unencrypted over insecure HTTP.`);
      }
    }
  } else {
    contradictoryEvidence.push('No external hyperlinks or domains were present in the submitted text, reducing automated phishing delivery probability.');
  }

  // 3. Contradictory / Benign evidence
  if (messageAnalysis.potentialBenignExplanations.length > 0) {
    messageAnalysis.potentialBenignExplanations.forEach(exp => contradictoryEvidence.push(exp));
  }

  // Bound the score
  const score = Math.min(100, Math.max(0, rawScore));

  // Determine Risk Level
  let overallRiskLevel: RiskLevel = 'LOW';
  let recommendedCategory: EvidenceAssessmentResult['recommendedCategory'] = 'SAFE_TO_PROCEED';
  if (score >= 75) {
    overallRiskLevel = 'CRITICAL';
    recommendedCategory = 'IMMEDIATE_AVOIDANCE';
  } else if (score >= 50) {
    overallRiskLevel = 'HIGH';
    recommendedCategory = 'IMMEDIATE_AVOIDANCE';
  } else if (score >= 25) {
    overallRiskLevel = 'ELEVATED';
    recommendedCategory = 'VERIFY_OFFICIALLY';
  } else {
    overallRiskLevel = 'LOW';
    recommendedCategory = 'PROCEED_WITH_CAUTION';
  }

  // Evidence Strength
  let evidenceStrength: EvidenceStrength = 'LIMITED';
  const totalIndicators = supportingIndicators.length;
  if (totalIndicators >= 4 || score >= 75) {
    evidenceStrength = 'STRONG';
  } else if (totalIndicators >= 2) {
    evidenceStrength = 'MODERATE';
  }

  // Uncertainty
  let uncertaintyLevel: UncertaintyLevel = 'MODERATE';
  let uncertaintyReason = 'Static analysis evaluates observable linguistic and domain patterns. Without external verification of the sender’s private cryptographic keys or carrier headers, certainty cannot be absolute.';
  if (score >= 80) {
    uncertaintyLevel = 'LOW';
    uncertaintyReason = 'Multiple independent high-fidelity fraud indicators (such as credential harvesting, lookalike domains, or OTP theft) align concurrently.';
  } else if (score < 20) {
    uncertaintyLevel = 'HIGH';
    uncertaintyReason = 'The text contains minimal overt red flags, but spear-phishing messages can appear completely benign until a secondary payload is delivered.';
  }

  const scoringMethodology = 'Composite Weighted Heuristic Index: Combines credential demand severity (weight 35), untrusted payment pressure (weight 30), domain deception (weight 30), direct IP/embedded credentials (weight 25), and psychological urgency indicators (weight 15). Note: This score is a qualitative diagnostic indicator, not an empirical guarantee.';

  const limitations = [
    ...messageAnalysis.analysisLimitations,
    'No system can guarantee that an unflagged message is 100% safe. Always verify independently through official known contacts.'
  ];

  return {
    overallRiskLevel,
    riskScore: score,
    scoringMethodology,
    evidenceStrength,
    uncertaintyLevel,
    uncertaintyReason,
    supportingIndicators,
    contradictoryEvidence,
    checksPerformed,
    checksUnavailable,
    limitations,
    recommendedCategory
  };
}
