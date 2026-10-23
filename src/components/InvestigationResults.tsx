import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Bookmark,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import type { InvestigationExecutionPlan } from '../types/index.ts';

interface InvestigationResultsProps {
  plan: InvestigationExecutionPlan;
  onOpenReportModal: () => void;
  onBackToWorkspace: () => void;
}

export const InvestigationResults: React.FC<InvestigationResultsProps> = ({
  plan,
  onOpenReportModal,
  onBackToWorkspace
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const { assessment, safetyPlan, urlInspections, savedRecord, verification } = plan;
  const isCriticalOrHigh = assessment.overallRiskLevel === 'CRITICAL' || assessment.overallRiskLevel === 'HIGH';
  const isElevated = assessment.overallRiskLevel === 'ELEVATED';

  const riskBadgeColor = isCriticalOrHigh
    ? 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
    : isElevated
    ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
    : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

  const handleCopySummary = () => {
    const text = `ScamSentry AI Investigation [${plan.planId}]
Risk Level: ${assessment.overallRiskLevel} (Heuristic Score: ${assessment.riskScore}/100)
Evidence Strength: ${assessment.evidenceStrength}
Primary Directive: ${safetyPlan.primaryDirective}
Key Findings:
${assessment.supportingIndicators.map((i) => `• ${i}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <button
            onClick={onBackToWorkspace}
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-1 inline-flex items-center gap-1"
          >
            ← Back to Input Workspace
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <span>Investigation Forensic Findings</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-md border font-mono font-semibold ${riskBadgeColor}`}>
              {assessment.overallRiskLevel} RISK
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Incident Report</span>
          </button>
        </div>
      </div>

      {/* Primary Directive Banner */}
      <div
        className={`p-5 rounded-xl border ${
          isCriticalOrHigh
            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
            : isElevated
            ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
            : 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {isCriticalOrHigh ? (
            <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : isElevated ? (
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h3 className="font-bold text-sm tracking-tight uppercase">Primary Directive</h3>
            <p className="text-sm font-medium leading-relaxed">{safetyPlan.primaryDirective}</p>
          </div>
        </div>
      </div>

      {/* Metrics Row: Risk Score, Evidence Strength, Uncertainty */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-1">
          <div className="text-xs font-semibold text-neutral-500">Heuristic Severity Score</div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
            {assessment.riskScore} <span className="text-xs text-neutral-400 font-sans font-normal">/ 100</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-tight">
            Diagnostic index based on credential demands, payment pressure, and deceptive syntax. Not an absolute statistical probability.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-1">
          <div className="text-xs font-semibold text-neutral-500">Evidence Strength</div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {assessment.evidenceStrength}
          </div>
          <p className="text-[11px] text-neutral-500 leading-tight">
            Based on {assessment.supportingIndicators.length} observable concrete indicators detected in the message payload.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-1">
          <div className="text-xs font-semibold text-neutral-500">Uncertainty Assessment</div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {assessment.uncertaintyLevel}
          </div>
          <p className="text-[11px] text-neutral-500 leading-tight">
            {assessment.uncertaintyReason}
          </p>
        </div>
      </div>

      {/* Detailed Forensic Indicators Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supporting Indicators */}
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
            <span>Supporting Indicators & Red Flags</span>
            <span className="font-mono text-xs text-rose-500 font-bold tabular-nums">
              ({assessment.supportingIndicators.length})
            </span>
          </h3>

          {assessment.supportingIndicators.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {assessment.supportingIndicators.map((ind, i) => (
                <li
                  key={i}
                  className="p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-slate-950/50 text-neutral-800 dark:text-neutral-200 flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{ind}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-neutral-500 py-4 text-center">
              No overt red flags detected in submitted text.
            </div>
          )}
        </div>

        {/* Contradictory / Benign Explanations */}
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
            <span>Contradictory / Benign Factors</span>
            <span className="font-mono text-xs text-neutral-400 font-medium tabular-nums">
              ({assessment.contradictoryEvidence.length})
            </span>
          </h3>

          <ul className="space-y-2 text-xs">
            {assessment.contradictoryEvidence.map((factor, i) => (
              <li
                key={i}
                className="p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-slate-950/50 text-neutral-700 dark:text-neutral-300 flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* URL Inspection Findings */}
      {urlInspections.length > 0 && (
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              URL Structural & Typosquatting Inspections ({urlInspections.length})
            </h3>
            <span className="text-xs text-neutral-400">RFC 3986 Lexical Parser (Zero SSRF)</span>
          </div>

          <div className="space-y-3">
            {urlInspections.map((urlRes, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-slate-950/50 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                  <span className="text-neutral-900 dark:text-white font-semibold break-all">
                    {urlRes.normalizedUrl}
                  </span>
                  <div className="flex items-center gap-2">
                    {urlRes.isLookalikeDomain && (
                      <span className="text-[10px] text-rose-500 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">
                        Lookalike Domain
                      </span>
                    )}
                    {urlRes.hasDeceptiveSubdomain && (
                      <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        Deceptive Subdomain
                      </span>
                    )}
                    {urlRes.isIpAddress && (
                      <span className="text-[10px] text-rose-500 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">
                        Raw IP Target
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-neutral-500">
                  Hostname: <strong className="font-mono text-neutral-700 dark:text-neutral-300">{urlRes.hostname}</strong> · Protocol: {urlRes.scheme} · Port: {urlRes.port || 'Standard'}
                </div>

                {urlRes.observableEvidence.length > 0 && (
                  <ul className="pt-1 space-y-1">
                    {urlRes.observableEvidence.map((ev, i) => (
                      <li key={i} className="text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5">
                        <span className="text-rose-500">⚠</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Action Plan & Defensive Guidance */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Tailored Safety Plan & Defensive Action Items
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safetyPlan.actionItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-slate-950/50 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900 dark:text-white">{item.title}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                    item.priority === 'URGENT'
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  }`}
                >
                  {item.priority}
                </span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Official Reporting Portals */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Official Reporting Portals & Hotlines:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {safetyPlan.officialReportingPortals.map((portal, idx) => (
              <a
                key={idx}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    {portal.name}
                  </div>
                  <div className="text-[11px] text-neutral-500">{portal.jurisdiction}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-500 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Persistence Verification Badge */}
      {verification && (
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <span className="font-semibold text-neutral-900 dark:text-white">Persisted & Verified:</span>{' '}
              <span className="text-neutral-600 dark:text-neutral-400">{verification.details}</span>
            </div>
          </div>
          {savedRecord && (
            <div className="font-mono text-[11px] text-neutral-400 tabular-nums shrink-0">
              SHA-256: {savedRecord.verificationHash.substring(0, 16)}...
            </div>
          )}
        </div>
      )}

      {/* Checks Executed vs Unavailable Transparency */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-slate-900/20 space-y-3 text-xs">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
            Forensic Check Transparency & Limitations
          </span>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1 font-mono text-[11px]"
          >
            <span>{showRawJson ? 'Hide Raw Audit JSON' : 'View Raw Audit JSON'}</span>
            {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              Checks Performed ({assessment.checksPerformed.length}):
            </div>
            <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
              {assessment.checksPerformed.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-500">✓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-semibold text-neutral-500 mb-1">
              Checks Unavailable Without Privileged Telemetry ({assessment.checksUnavailable.length}):
            </div>
            <ul className="space-y-1 text-neutral-500">
              {assessment.checksUnavailable.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span>○</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {showRawJson && (
          <pre className="mt-3 p-3 rounded-lg bg-neutral-900 text-neutral-200 dark:bg-black font-mono text-[11px] overflow-x-auto max-h-72">
            {JSON.stringify(plan, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
