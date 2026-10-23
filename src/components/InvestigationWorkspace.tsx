import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileSearch,
  Eye,
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { runInvestigation } from '../services/apiClient.ts';
import { SAMPLE_TEST_CASES, type SampleTestCase } from '../data/sampleCases.ts';
import type { InvestigationExecutionPlan, AgentStepExecution } from '../types/index.ts';

interface InvestigationWorkspaceProps {
  initialSample?: SampleTestCase | null;
  onInvestigationComplete: (plan: InvestigationExecutionPlan) => void;
  isAlexaMode: boolean;
  onAlexaNarrate?: (text: string) => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  initialSample,
  onInvestigationComplete,
  isAlexaMode,
  onAlexaNarrate
}) => {
  const [messageText, setMessageText] = useState<string>('');
  const [submittedUrl, setSubmittedUrl] = useState<string>('');
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<InvestigationExecutionPlan | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  useEffect(() => {
    if (initialSample) {
      setMessageText(initialSample.messageText);
      setSubmittedUrl(initialSample.url || '');
      setErrorMessage(null);
    }
  }, [initialSample]);

  const handleSelectPreset = (sample: SampleTestCase) => {
    setMessageText(sample.messageText);
    setSubmittedUrl(sample.url || '');
    setErrorMessage(null);
  };

  const handleClear = () => {
    setMessageText('');
    setSubmittedUrl('');
    setErrorMessage(null);
    setCurrentPlan(null);
  };

  const handleStartInvestigation = async () => {
    if (!messageText.trim()) {
      setErrorMessage('Please enter or paste the suspicious message text to investigate.');
      return;
    }

    if (messageText.length > 10000) {
      setErrorMessage('Message text exceeds maximum length of 10,000 characters.');
      return;
    }

    setErrorMessage(null);
    setIsExecuting(true);
    setActiveStepIndex(1);

    if (isAlexaMode && onAlexaNarrate) {
      onAlexaNarrate("Starting investigation. ScamSentry agent is analyzing linguistics and inspecting evidence...");
    }

    try {
      const plan = await runInvestigation(messageText.trim(), submittedUrl.trim() || null, autoSave);
      setCurrentPlan(plan);
      setIsExecuting(false);

      if (isAlexaMode && onAlexaNarrate) {
        const risk = plan.assessment.overallRiskLevel;
        onAlexaNarrate(`Investigation complete. Assessed risk level is ${risk}. ${plan.safetyPlan.primaryDirective}`);
      }

      onInvestigationComplete(plan);
    } catch (err: any) {
      setIsExecuting(false);
      setErrorMessage(err?.message || 'An error occurred during agent investigation execution.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Investigation Workspace
            </h1>
            {isAlexaMode && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Bot className="w-3 h-3" /> Alexa+ Voice Active
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            Submit a message or communication snippet to launch a multi-step evidence extraction pipeline.
          </p>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-neutral-400 whitespace-nowrap">Load Preset:</span>
          {SAMPLE_TEST_CASES.slice(0, 3).map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => handleSelectPreset(s)}
              className="text-xs px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-800 whitespace-nowrap transition-colors"
            >
              {s.badge}
            </button>
          ))}
        </div>
      </div>

      {/* Main Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Message Text Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="message-input" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Suspicious Message / Email / SMS Text <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-mono text-neutral-400 tabular-nums">
                {messageText.length} / 10,000 chars
              </span>
            </div>

            <textarea
              id="message-input"
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Paste the suspicious communication text here (e.g. unsolicited job offer, bank fraud text, delivery fee SMS, or wire transfer demand)..."
              disabled={isExecuting}
              className="w-full p-3.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 dark:focus:ring-amber-400/50 resize-y font-mono"
            />
          </div>

          {/* Optional URL Input */}
          <div className="space-y-2">
            <label htmlFor="url-input" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span>Target URL / Link (Optional)</span>
            </label>
            <input
              id="url-input"
              type="text"
              value={submittedUrl}
              onChange={(e) => setSubmittedUrl(e.target.value)}
              placeholder="e.g. https://careers-google-verify.xyz/login or http://192.168.1.100:8080"
              disabled={isExecuting}
              className="w-full p-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 font-mono"
            />
            <p className="text-[11px] text-neutral-500">
              URL is parsed statically according to RFC 3986 for typosquatting, deceptive subdomains, and suspicious ports. It will never be visited or fetched.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleStartInvestigation}
                disabled={isExecuting || !messageText.trim()}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-xs"
              >
                {isExecuting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white dark:border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>Investigating...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Full Agent Pipeline</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={isExecuting}
                className="px-3 py-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-800 transition-colors"
              >
                Clear
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                disabled={isExecuting}
                className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-amber-500"
              />
              <span>Auto-persist with verification hash</span>
            </label>
          </div>
        </div>

        {/* Sidebar: Pipeline Inspector & Tool Guide */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white">
              <span>Investigation Tool Chain</span>
              <span className="font-mono text-neutral-400 text-[11px]">8 Real Tools</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: 'analyze_message', role: 'Linguistic & entity extraction' },
                { name: 'inspect_url', role: 'SSRF-safe structural domain heuristics' },
                { name: 'assess_evidence', role: 'Evidence strength & uncertainty assessment' },
                { name: 'create_safety_plan', role: 'Defensive directives & reporting portals' },
                { name: 'prepare_incident_report', role: 'XSS-escaped forensic report export' },
                { name: 'save_investigation', role: 'Database persistence & hashing' },
                { name: 'verify_action', role: 'SHA-256 read-back verification' }
              ].map((tool, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-md border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-slate-950/60 flex items-start gap-2"
                >
                  <span className="font-mono text-[10px] text-neutral-400 mt-0.5">0{idx + 1}</span>
                  <div>
                    <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 text-[11px]">
                      {tool.name}
                    </div>
                    <div className="text-[11px] text-neutral-500">{tool.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Timeline (renders during or after run) */}
      {currentPlan && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Agent Execution Pipeline Complete
              </h3>
            </div>
            <div className="font-mono text-xs text-neutral-500 tabular-nums">
              Total Duration: {currentPlan.totalDurationMs}ms · Plan: {currentPlan.planId}
            </div>
          </div>

          <div className="space-y-2">
            {currentPlan.steps.map((step) => (
              <div
                key={step.stepIndex}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 sm:mt-0">
                    {step.stepIndex}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>{step.stepName}</span>
                      <span className="font-mono text-[11px] text-neutral-400">({step.toolInvoked})</span>
                    </div>
                    <div className="text-neutral-500 text-[11px] mt-0.5">{step.outputSummary}</div>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-neutral-400 tabular-nums shrink-0">
                  {step.durationMs}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
