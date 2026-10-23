import { z } from 'zod';
import type { EvidenceAssessmentResult } from './assessEvidence.ts';
import type { SafetyPlanResult } from './createSafetyPlan.ts';

export interface PreparedIncidentReport {
  reportId: string;
  generatedAt: string;
  caseId: string;
  summary: {
    riskLevel: string;
    riskScore: number;
    evidenceStrength: string;
    claimedEntity: string;
  };
  markdownContent: string;
  sanitizedHtmlContent: string;
  rawJsonExport: Record<string, any>;
}

export const PrepareIncidentReportInputSchema = z.object({
  caseId: z.string(),
  messageText: z.string(),
  submittedUrl: z.string().optional(),
  assessment: z.any(),
  safetyPlan: z.any(),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function prepareIncidentReport(
  caseId: string,
  messageText: string,
  submittedUrl: string | undefined,
  assessment: EvidenceAssessmentResult,
  safetyPlan: SafetyPlanResult,
  claimedOrganization?: string | null
): PreparedIncidentReport {
  const reportId = `REP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  const safeMessage = escapeHtml(messageText);
  const safeUrl = submittedUrl ? escapeHtml(submittedUrl) : 'None provided';
  const safeOrg = claimedOrganization ? escapeHtml(claimedOrganization) : 'Unspecified';

  // Build Markdown Report
  const markdownLines: string[] = [
    `# ScamSentry AI — Forensic Incident Investigation Report`,
    `**Report Reference ID:** ${reportId}`,
    `**Case Reference ID:** ${caseId}`,
    `**Timestamp:** ${timestamp}`,
    ``,
    `---`,
    `## 1. Executive Risk Summary`,
    `- **Assessed Risk Level:** ${assessment.overallRiskLevel}`,
    `- **Heuristic Risk Score:** ${assessment.riskScore}/100`,
    `- **Evidence Strength:** ${assessment.evidenceStrength}`,
    `- **Uncertainty Level:** ${assessment.uncertaintyLevel} (${assessment.uncertaintyReason})`,
    `- **Claimed Organization / Entity:** ${claimedOrganization || 'Not specified'}`,
    `- **Recommended Directive:** ${safetyPlan.primaryDirective}`,
    ``,
    `---`,
    `## 2. Submitted Artifacts`,
    `### Analyzed Message Body:`,
    `\`\`\``,
    messageText,
    `\`\`\``,
    submittedUrl ? `### Submitted URL / Hyperlink:\n\`${submittedUrl}\`\n` : '',
    `---`,
    `## 3. Observable Indicators & Forensic Findings`,
    `### Supporting Indicators:`,
    ...assessment.supportingIndicators.map(i => `- ${i}`),
    ``,
    `### Contradictory / Benign Factors:`,
    ...assessment.contradictoryEvidence.map(c => `- ${c}`),
    ``,
    `### Checks Executed:`,
    ...assessment.checksPerformed.map(cp => `- [x] ${cp}`),
    ``,
    `### Checks Unavailable:`,
    ...assessment.checksUnavailable.map(cu => `- [ ] ${cu}`),
    ``,
    `---`,
    `## 4. Safety Guidance & Remediation Plan`,
    ...safetyPlan.actionItems.map(item => `### [${item.priority}] ${item.title}\n${item.description}\n`),
    ``,
    `---`,
    `## 5. Official Reporting Portals`,
    ...safetyPlan.officialReportingPortals.map(p => `- **${p.name}** (${p.jurisdiction}): [${p.url}](${p.url}) — ${p.purpose}`),
    ``,
    `---`,
    `## 6. Methodological Limitations & Disclaimer`,
    ...assessment.limitations.map(lim => `- ${lim}`),
    ``,
    `*Notice: This report is generated algorithmically by ScamSentry AI for educational and defensive assessment. It does not constitute formal legal testimony or a guarantee that unflagged content is completely risk-free.*`
  ];

  const markdownContent = markdownLines.join('\n');

  // Build clean HTML for print preview
  const sanitizedHtmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 24px;">
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #0f172a;">ScamSentry AI — Incident Investigation Report</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Report ID: <strong>${escapeHtml(reportId)}</strong> · Case ID: <strong>${escapeHtml(caseId)}</strong> · Date: <strong>${escapeHtml(timestamp)}</strong></p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="margin-top: 0; font-size: 16px; color: #0f172a;">Executive Risk Assessment</h2>
        <p style="margin: 4px 0;"><strong>Overall Risk Level:</strong> <span style="font-weight: bold; color: ${assessment.overallRiskLevel === 'CRITICAL' || assessment.overallRiskLevel === 'HIGH' ? '#dc2626' : assessment.overallRiskLevel === 'ELEVATED' ? '#d97706' : '#16a34a'};">${assessment.overallRiskLevel}</span></p>
        <p style="margin: 4px 0;"><strong>Heuristic Score:</strong> ${assessment.riskScore}/100 (Methodology: Weighted heuristic matrix)</p>
        <p style="margin: 4px 0;"><strong>Evidence Strength:</strong> ${assessment.evidenceStrength}</p>
        <p style="margin: 4px 0;"><strong>Target Entity Claimed:</strong> ${safeOrg}</p>
        <p style="margin: 4px 0;"><strong>Primary Directive:</strong> ${escapeHtml(safetyPlan.primaryDirective)}</p>
      </div>

      <h3 style="font-size: 15px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Submitted Suspicious Message Body</h3>
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 13px; white-space: pre-wrap; margin-bottom: 20px;">${safeMessage}</div>

      <h3 style="font-size: 15px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Forensic Findings & Red Flags</h3>
      <ul style="padding-left: 20px; font-size: 14px;">
        ${assessment.supportingIndicators.map(i => `<li style="margin-bottom: 6px;">${escapeHtml(i)}</li>`).join('')}
      </ul>

      <h3 style="font-size: 15px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Recommended Action Plan</h3>
      <ol style="padding-left: 20px; font-size: 14px;">
        ${safetyPlan.actionItems.map(item => `<li style="margin-bottom: 8px;"><strong>[${escapeHtml(item.priority)}] ${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)}</li>`).join('')}
      </ol>

      <div style="margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        Generated by ScamSentry AI. Never treat unchecked messages as guaranteed safe.
      </div>
    </div>
  `;

  return {
    reportId,
    generatedAt: timestamp,
    caseId,
    summary: {
      riskLevel: assessment.overallRiskLevel,
      riskScore: assessment.riskScore,
      evidenceStrength: assessment.evidenceStrength,
      claimedEntity: claimedOrganization || 'Unspecified'
    },
    markdownContent,
    sanitizedHtmlContent,
    rawJsonExport: {
      reportId,
      caseId,
      timestamp,
      assessment,
      safetyPlan,
      submittedContent: {
        message: messageText,
        url: submittedUrl || null,
        claimedOrganization: claimedOrganization || null
      }
    }
  };
}
