import React from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  FileText,
  Lock,
  ArrowRight,
  Database,
  Terminal,
  ExternalLink,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { SAMPLE_TEST_CASES, type SampleTestCase } from '../data/sampleCases.ts';

interface LandingPageProps {
  onSelectSample: (sample: SampleTestCase) => void;
  onOpenWorkspace: () => void;
  onOpenMcp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectSample,
  onOpenWorkspace,
  onOpenMcp
}) => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-1">
            <span>Amazon Developer Hackathon 2026</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Alexa+ Track & MCP Protocol 2025-11-25</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white" style={{ textWrap: 'balance' }}>
            Evidence-Driven Agentic Fraud Investigation
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            ScamSentry AI helps students and everyday internet users verify suspicious recruitment messages, fake internship offers, smishing links, and urgent payment demands using verifiable, observable evidence.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onOpenWorkspace}
              className="px-5 py-3 text-sm font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Launch Investigation Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenMcp}
              className="px-5 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              <Terminal className="w-4 h-4 text-amber-500" />
              <span>Inspect MCP Server</span>
            </button>
          </div>
        </div>

        {/* Hero Visual Anchor (Safe vector SVG cyber diagnostics interface) */}
        <div className="max-w-5xl mx-auto mt-12 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-200">INVESTIGATION PIPELINE ARCHITECTURE</span>
            </div>
            <span>RFC 3986 · Zero SSRF · SHA-256 Audit Trail</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-6 text-center text-xs">
            {[
              { step: '01', name: 'Investigate', desc: 'Input validation' },
              { step: '02', name: 'Evidence', desc: 'Entity extraction' },
              { step: '03', name: 'Inspect URL', desc: 'SSRF-safe syntax' },
              { step: '04', name: 'Assess Risk', desc: 'Observable signals' },
              { step: '05', name: 'Explain', desc: 'Uncertainty limits' },
              { step: '06', name: 'Recommend', desc: 'Safety plan' },
              { step: '07', name: 'Confirm', desc: 'Consequential gates' },
              { step: '08', name: 'Verify', desc: 'Read-back audit' }
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-950/80 flex flex-col justify-between"
              >
                <div className="font-mono text-neutral-400 text-[11px] mb-1">{item.step}</div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</div>
                <div className="text-[11px] text-neutral-500 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="max-w-5xl mx-auto">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Beyond a Generic Chatbot
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
            ScamSentry AI runs autonomous specialized tools, computes observable indicators, and acknowledges uncertainty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
              Linguistic & Financial Extraction
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Dissects urgent pressure tactics, gift card and cryptocurrency demands, OTP phishing prompts, and detects claimed brand impersonation.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
              Safe-by-Default URL Inspection
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Examines lookalike domains, deceptive subdomains, embedded credentials, and suspicious TLDs without ever visiting the link, preventing SSRF and tracker beaconing.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
              Cryptographic Read-Back Verification
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Persists findings to an indexed database with SHA-256 payload integrity hashing. Every action is verified through a real read-back check.
            </p>
          </div>
        </div>
      </section>

      {/* Preset Test Cases Section */}
      <section className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Try Preset Investigation Scenarios
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
              Select a real-world scenario to launch an instant forensic investigation.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-500">5 Pre-configured Test Cases</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_TEST_CASES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="text-left p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{sample.category}</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {sample.expectedRisk}
                  </span>
                </div>
                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm group-hover:text-amber-500 transition-colors">
                  {sample.title}
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3">
                  {sample.messageText}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500">
                <span className="truncate max-w-[180px]">{sample.keyFlags.join(' · ')}</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 shrink-0">
                  Investigate <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Security & Privacy Principles */}
      <section className="max-w-5xl mx-auto p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-slate-900/30 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-800 flex items-center justify-center">
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
              Security & Privacy Guarantee
            </h3>
            <p className="text-xs text-neutral-500">Engineered for forensic safety and zero data leakage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-200 block mb-1">
              Zero SSRF Exploitation
            </span>
            Submitted URLs are analyzed using RFC 3986 lexical grammars. No outbound HTTP requests or DNS fetches are initiated.
          </div>
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-200 block mb-1">
              Prompt Injection Defense
            </span>
            Untrusted text is strictly isolated in isolated XML delimiters. Embedded adversarial commands cannot hijack agent tools.
          </div>
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-200 block mb-1">
              Honest Uncertainty
            </span>
            We never claim 100% scam detection certainty. Scores reflect qualitative heuristics and clearly document limitations.
          </div>
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-200 block mb-1">
              User Deletion Control
            </span>
            Users can inspect saved case hashes and purge database records with instant verification read-backs.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto pt-8 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          ScamSentry AI · Amazon Developer Hackathon 2026 Submission · Built with Gemini & MCP SDK
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onOpenMcp} className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            MCP Protocol Server
          </button>
          <span>·</span>
          <button onClick={onOpenWorkspace} className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Investigation Engine
          </button>
        </div>
      </footer>
    </div>
  );
};
