import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Printer,
  FileText,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import type { InvestigationExecutionPlan } from '../types/index.ts';

interface IncidentReportModalProps {
  plan: InvestigationExecutionPlan;
  onClose: () => void;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({ plan, onClose }) => {
  const [copied, setCopied] = useState(false);

  const report = plan.report;
  if (!report) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(report.markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([report.markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScamSentry-Report-${report.reportId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(report.rawJsonExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScamSentry-Report-${report.reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ScamSentry AI — Forensic Report ${report.reportId}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            ${report.sanitizedHtmlContent}
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-300 dark:border-neutral-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-800 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Forensic Incident Investigation Report
              </h2>
              <div className="font-mono text-[11px] text-neutral-400">
                {report.reportId} · Case {report.caseId}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Toolbar */}
        <div className="px-5 py-2.5 bg-neutral-50 dark:bg-slate-950/50 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-neutral-500">
            Escaped & Sanitized for official evidence filing
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .MD</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .JSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Report Preview Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900 select-text">
          {report.markdownContent}
        </div>
      </div>
    </div>
  );
};
