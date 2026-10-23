export type RiskLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
export type EvidenceStrength = 'LIMITED' | 'MODERATE' | 'STRONG' | 'CONCLUSIVE';
export type UncertaintyLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface ExtractedFact {
  type: 'url' | 'organization' | 'payment_method' | 'credential_type' | 'urgency_keyword' | 'contact_handle';
  value: string;
  context: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AnalyzeMessageResult {
  extractedUrls: string[];
  claimedOrganization: string | null;
  paymentDemands: string[];
  credentialRequests: string[];
  urgencySignals: string[];
  impersonationIndicators: string[];
  observableFacts: ExtractedFact[];
  potentialBenignExplanations: string[];
  analysisLimitations: string[];
  analysisSource: 'GEMINI_AI' | 'HEURISTIC_ANALYSIS';
}

export interface UrlInspectionResult {
  url: string;
  normalizedUrl: string;
  scheme: string;
  hostname: string;
  port: string | null;
  pathname: string;
  isIpAddress: boolean;
  hasEmbeddedCredentials: boolean;
  hasUnusualPort: boolean;
  isLookalikeDomain: boolean;
  lookalikeTarget: string | null;
  hasDeceptiveSubdomain: boolean;
  suspiciousTld: boolean;
  suspiciousTokens: string[];
  reputationCheck: {
    performed: boolean;
    provider: string;
    status: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
    details: string;
  };
  observableEvidence: string[];
  limitations: string[];
}

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

export interface SafetyActionItem {
  id: string;
  type: 'DO_NOT' | 'VERIFICATION_STEP' | 'REMEDIATION_STEP' | 'OFFICIAL_REPORTING';
  title: string;
  description: string;
  priority: 'URGENT' | 'HIGH' | 'RECOMMENDED';
}

export interface OfficialReportingPortal {
  name: string;
  jurisdiction: string;
  url: string;
  purpose: string;
}

export interface SafetyPlanResult {
  riskLevel: RiskLevel;
  primaryDirective: string;
  actionItems: SafetyActionItem[];
  officialReportingPortals: OfficialReportingPortal[];
  disclaimer: string;
}

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
  savedRecord?: {
    caseId: string;
    createdAt: string;
    verificationHash: string;
    title: string;
    persisted: boolean;
  };
  verification?: {
    actionType: string;
    targetId: string;
    verified: boolean;
    timestamp: string;
    details: string;
  };
  report?: PreparedIncidentReport;
  error?: string;
}

export interface PersistedInvestigationCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  messageText: string;
  submittedUrl?: string | null;
  claimedOrganization?: string | null;
  riskLevel: RiskLevel;
  riskScore: number;
  evidenceStrength: string;
  assessment: EvidenceAssessmentResult;
  safetyPlan: SafetyPlanResult;
  toolsExecuted: string[];
  verificationHash: string;
}

export interface SystemHealthStatus {
  status: string;
  timestamp: string;
  aiEngine: {
    provider: string;
    model: string;
    configured: boolean;
    fallbackAvailable: boolean;
    fallbackType: string;
  };
  mcp: {
    serverName: string;
    protocolVersion: string;
    transport: string;
    toolsCount: number;
  };
  persistence: {
    type: string;
    status: string;
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}
