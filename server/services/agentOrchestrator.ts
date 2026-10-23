import { analyzeMessageWithGemini } from './geminiService.ts';
import { inspectUrl, type UrlInspectionResult } from '../tools/inspectUrl.ts';
import { assessEvidence, type EvidenceAssessmentResult } from '../tools/assessEvidence.ts';
import { createSafetyPlan, type SafetyPlanResult } from '../tools/createSafetyPlan.ts';
import { saveInvestigation, type SaveInvestigationOutput } from '../tools/saveInvestigation.ts';
import { prepareIncidentReport, type PreparedIncidentReport } from '../tools/prepareIncidentReport.ts';
import { verifyAction, type VerifyActionResult } from '../tools/verifyAction.ts';
import { db } from '../db/database.ts';

export interface AgentStepExecution {
  stepIndex: number;
  stepName: string;
  toolInvoked: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt: string;
  finishedAt?: string;
  durationMs: number;
  inputSummary: string;
  outputSummary: string;
  data?: any;
}

export interface InvestigationExecutionPlan {
  planId: string;
  startedAt: string;
  completedAt?: string;
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED';
  totalDurationMs: number;
  messageText: string;
  submittedUrl?: string | null;
  steps: AgentStepExecution[];
  assessment: EvidenceAssessmentResult;
  safetyPlan: SafetyPlanResult;
  urlInspections: UrlInspectionResult[];
  savedRecord?: SaveInvestigationOutput;
  verification?: VerifyActionResult;
  report?: PreparedIncidentReport;
  error?: string;
}

export async function executeInvestigationAgent(input: {
  messageText: string;
  submittedUrl?: string | null;
  autoSave?: boolean;
}): Promise<InvestigationExecutionPlan> {
  const planId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const steps: AgentStepExecution[] = [];

  const addStep = (
    stepName: string,
    toolInvoked: string,
    inputSummary: string
  ): AgentStepExecution => {
    const step: AgentStepExecution = {
      stepIndex: steps.length + 1,
      stepName,
      toolInvoked,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      durationMs: 0,
      inputSummary,
      outputSummary: 'Executing...',
    };
    steps.push(step);
    return step;
  };

  const completeStep = (step: AgentStepExecution, outputSummary: string, data?: any) => {
    step.status = 'COMPLETED';
    step.finishedAt = new Date().toISOString();
    step.durationMs = Date.now() - new Date(step.startedAt).getTime();
    step.outputSummary = outputSummary;
    step.data = data;
    
    db.logAudit({
      caseId: planId,
      toolName: step.toolInvoked,
      action: step.stepName,
      outcome: 'SUCCESS',
      durationMs: step.durationMs,
      details: outputSummary
    });
  };

  const failStep = (step: AgentStepExecution, err: any) => {
    step.status = 'FAILED';
    step.finishedAt = new Date().toISOString();
    step.durationMs = Date.now() - new Date(step.startedAt).getTime();
    step.outputSummary = `Error: ${err?.message || err}`;
    
    db.logAudit({
      caseId: planId,
      toolName: step.toolInvoked,
      action: step.stepName,
      outcome: 'FAILURE',
      durationMs: step.durationMs,
      details: err?.message || 'Tool execution failed'
    });
  };

  try {
    // STEP 1: Analyze Message
    const step1 = addStep(
      'Linguistic & Entity Extraction',
      'analyze_message',
      `Analyzing ${input.messageText.length} characters of message text`
    );
    const { result: messageAnalysis, usedGemini } = await analyzeMessageWithGemini(input.messageText);
    completeStep(
      step1,
      `Extracted ${messageAnalysis.extractedUrls.length} URLs, ${messageAnalysis.paymentDemands.length} payment keywords, ${messageAnalysis.credentialRequests.length} credential tokens (Engine: ${usedGemini ? 'Gemini 3.8 Flash' : 'Deterministic Heuristic'})`,
      messageAnalysis
    );

    // STEP 2: Inspect URLs
    const urlsToInspect = Array.from(
      new Set([
        ...(input.submittedUrl ? [input.submittedUrl] : []),
        ...messageAnalysis.extractedUrls
      ])
    ).filter(Boolean);

    const urlInspections: UrlInspectionResult[] = [];
    if (urlsToInspect.length > 0) {
      const step2 = addStep(
        'URL Structure & Lookalike Domain Inspection',
        'inspect_url',
        `Inspecting ${urlsToInspect.length} target URLs statically`
      );
      for (const u of urlsToInspect) {
        const uResult = inspectUrl(u);
        urlInspections.push(uResult);
      }
      const lookalikes = urlInspections.filter(u => u.isLookalikeDomain || u.hasDeceptiveSubdomain).length;
      completeStep(
        step2,
        `Inspected ${urlInspections.length} URLs. Identified ${lookalikes} lookalike/deceptive domains. Zero network requests made (SSRF-protected).`,
        urlInspections
      );
    } else {
      const step2 = addStep(
        'URL Structure Inspection',
        'inspect_url',
        'No URLs submitted or extracted'
      );
      step2.status = 'SKIPPED';
      step2.outputSummary = 'No hyperlinks present in input. Skipping URL structural checks.';
    }

    // STEP 3: Assess Evidence
    const step3 = addStep(
      'Evidence Synthesis & Risk Assessment',
      'assess_evidence',
      'Combining extracted facts, linguistic patterns, and domain heuristics'
    );
    const assessment = assessEvidence(messageAnalysis, urlInspections);
    completeStep(
      step3,
      `Calculated Risk: ${assessment.overallRiskLevel} (Score: ${assessment.riskScore}/100, Evidence: ${assessment.evidenceStrength}, Uncertainty: ${assessment.uncertaintyLevel})`,
      assessment
    );

    // STEP 4: Create Safety Plan
    const step4 = addStep(
      'Defensive Guidance & Action Planning',
      'create_safety_plan',
      `Formulating safety measures for risk level: ${assessment.overallRiskLevel}`
    );
    const hasCredentials = messageAnalysis.credentialRequests.length > 0;
    const hasPayments = messageAnalysis.paymentDemands.length > 0;
    const safetyPlan = createSafetyPlan(
      assessment.overallRiskLevel,
      hasCredentials,
      hasPayments,
      messageAnalysis.claimedOrganization
    );
    completeStep(
      step4,
      `Generated directive: "${safetyPlan.primaryDirective}" with ${safetyPlan.actionItems.length} prioritized action items and ${safetyPlan.officialReportingPortals.length} reporting endpoints`,
      safetyPlan
    );

    // STEP 5: Prepare Incident Report
    const step5 = addStep(
      'Incident Report Compilation',
      'prepare_incident_report',
      'Generating sanitized Markdown, HTML, and JSON representations'
    );
    const report = prepareIncidentReport(
      planId,
      input.messageText,
      input.submittedUrl || undefined,
      assessment,
      safetyPlan,
      messageAnalysis.claimedOrganization
    );
    completeStep(
      step5,
      `Compiled incident report ${report.reportId} with full XSS escaping and export capabilities`,
      { reportId: report.reportId }
    );

    // STEP 6: Optional Auto-save or Verification
    let savedRecord: SaveInvestigationOutput | undefined;
    let verification: VerifyActionResult | undefined;

    if (input.autoSave !== false) {
      const step6 = addStep(
        'Persistence to Database',
        'save_investigation',
        `Persisting case record ${planId} with audit trail`
      );
      savedRecord = saveInvestigation({
        id: planId,
        messageText: input.messageText,
        submittedUrl: input.submittedUrl,
        claimedOrganization: messageAnalysis.claimedOrganization,
        riskLevel: assessment.overallRiskLevel,
        riskScore: assessment.riskScore,
        evidenceStrength: assessment.evidenceStrength,
        assessment,
        safetyPlan,
        toolsExecuted: steps.map(s => s.toolInvoked)
      });
      completeStep(
        step6,
        `Persisted case '${savedRecord.caseId}' with SHA-256 integrity hash ${savedRecord.verificationHash.substring(0, 10)}...`,
        savedRecord
      );

      // STEP 7: Read-back Verification
      const step7 = addStep(
        'Action Read-Back Verification',
        'verify_action',
        `Verifying persistence integrity for ${planId}`
      );
      verification = verifyAction({
        actionType: 'PERSISTENCE_VERIFICATION',
        targetId: planId,
        expectedHash: savedRecord.verificationHash
      });
      completeStep(
        step7,
        verification.details,
        verification
      );
    } else {
      // Ephemeral mode: Verify report generation without writing private data to shared persistent store
      const step6 = addStep(
        'Ephemeral Report Verification',
        'verify_action',
        `Verifying report generation integrity for ${report.reportId}`
      );
      verification = verifyAction({
        actionType: 'REPORT_GENERATION_VERIFICATION',
        targetId: report.reportId
      });
      completeStep(
        step6,
        'Verified in-memory forensic report integrity (ephemeral mode - private data not written to shared database).',
        verification
      );
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      planId,
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'COMPLETED',
      totalDurationMs,
      messageText: input.messageText,
      submittedUrl: input.submittedUrl,
      steps,
      assessment,
      safetyPlan,
      urlInspections,
      savedRecord,
      verification,
      report
    };
  } catch (err: any) {
    const totalDurationMs = Date.now() - startTime;
    return {
      planId,
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'FAILED',
      totalDurationMs,
      messageText: input.messageText,
      submittedUrl: input.submittedUrl,
      steps,
      assessment: assessEvidence(
        {
          extractedUrls: [],
          claimedOrganization: null,
          paymentDemands: [],
          credentialRequests: [],
          urgencySignals: [],
          impersonationIndicators: [],
          observableFacts: [],
          potentialBenignExplanations: [],
          analysisLimitations: ['Agent workflow encountered an error.'],
          analysisSource: 'HEURISTIC_ANALYSIS'
        },
        []
      ),
      safetyPlan: createSafetyPlan('ELEVATED', false, false, null),
      urlInspections: [],
      error: err?.message || 'Agent orchestration error occurred'
    };
  }
}
