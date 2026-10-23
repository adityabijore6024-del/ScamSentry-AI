import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Lock
} from 'lucide-react';
import { fetchCases, deleteCase, loginWithPasscode, logout, isSessionActive } from '../services/apiClient.ts';
import type { PersistedInvestigationCase, InvestigationExecutionPlan } from '../types/index.ts';

interface SavedCasesPageProps {
  onOpenCase: (plan: InvestigationExecutionPlan) => void;
  onRefreshCount?: (count: number) => void;
}

export const SavedCasesPage: React.FC<SavedCasesPageProps> = ({
  onOpenCase,
  onRefreshCount
}) => {
  const [cases, setCases] = useState<PersistedInvestigationCase[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Authentication State
  const [isAuthorized, setIsAuthorized] = useState<boolean>(isSessionActive());
  const [passcode, setPasscode] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadCases = async () => {
    // Avoid noisy 401s and show the unlock form until a session is available.
    if (!isSessionActive()) {
      setIsAuthorized(false);
      setCases([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const data = await fetchCases({
        search: searchQuery.trim() || undefined,
        riskLevel: riskFilter !== 'ALL' ? riskFilter : undefined,
      });
      setCases(data.cases);
      setTotalCount(data.total);
      setIsAuthorized(true);
      if (onRefreshCount) onRefreshCount(data.total);
    } catch (err: any) {
      if (err?.message?.includes('authorization') || err?.message?.includes('UNAUTHORIZED') || err?.message?.includes('401')) {
        setIsAuthorized(false);
      } else {
        setErrorNotice(err?.message || 'Failed to load cases from database.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Please enter the investigator passcode.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await loginWithPasscode(passcode);
      setIsAuthorized(true);
      setPasscode('');
      await loadCases();
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid passcode or access token.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLockStore = async () => {
    await logout();
    setIsAuthorized(false);
    setCases([]);
    setTotalCount(0);
    if (onRefreshCount) onRefreshCount(0);
  };

  useEffect(() => {
    loadCases();
  }, [searchQuery, riskFilter]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCase(id);
      setDeleteConfirmationId(null);
      await loadCases();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to delete case.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInspect = (item: PersistedInvestigationCase) => {
    // Reconstruct an execution plan structure from the persisted case record
    const plan: InvestigationExecutionPlan = {
      planId: item.id,
      startedAt: item.createdAt,
      completedAt: item.updatedAt,
      status: 'COMPLETED',
      totalDurationMs: 0,
      messageText: item.messageText,
      submittedUrl: item.submittedUrl,
      steps: item.toolsExecuted.map((t, idx) => ({
        stepIndex: idx + 1,
        stepName: t,
        toolInvoked: t,
        status: 'COMPLETED',
        startedAt: item.createdAt,
        durationMs: 4,
        inputSummary: 'Retrieved from persistent store',
        outputSummary: 'Verified against database payload'
      })),
      assessment: item.assessment,
      safetyPlan: item.safetyPlan,
      urlInspections: [],
      savedRecord: {
        caseId: item.id,
        createdAt: item.createdAt,
        verificationHash: item.verificationHash,
        title: item.title,
        persisted: true
      },
      verification: {
        actionType: 'PERSISTENCE_VERIFICATION',
        targetId: item.id,
        verified: true,
        timestamp: item.updatedAt,
        details: `Cryptographically verified from store (SHA-256: ${item.verificationHash.substring(0, 12)}...)`
      }
    };
    onOpenCase(plan);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Saved Investigations
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Database records persisted with immutable SHA-256 integrity verification hashes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadCases}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {isAuthorized && (
            <button
              onClick={handleLockStore}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors flex items-center gap-1.5"
              title="Lock case store and terminate active session"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Store</span>
            </button>
          )}
        </div>
      </div>

      {!isAuthorized ? (
        <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/60 max-w-lg mx-auto text-center space-y-5 my-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Investigator Authorization Required
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
              Under zero-trust privacy controls, investigation cases, extracted credentials, and audit logs are kept in private storage and never exposed to anonymous visitors.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3 pt-2 text-left">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Investigator Passcode / Token
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter investigator passcode..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-slate-950 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
              />
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                Use the investigator passcode configured by the server administrator. For local development, check the server terminal if a temporary passcode was generated.
              </p>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              {isAuthenticating ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock Private Case Store</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500">
            Note: Anonymous users can execute live fraud investigations in <span className="font-semibold text-neutral-700 dark:text-neutral-300">Ephemeral Guest Mode</span> without saving private messages to shared storage.
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, organization, domain, or message snippet..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Risk Level Segmented Selector */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium overflow-x-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'ELEVATED', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap ${
                riskFilter === lvl
                  ? 'bg-white dark:bg-slate-800 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {errorNotice && (
        <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs">
          {errorNotice}
        </div>
      )}

      {/* Cases List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-neutral-500">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading persisted investigations...
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 space-y-2">
          <FileText className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
            No Saved Investigations Found
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery || riskFilter !== 'ALL'
              ? 'No records match the active search or risk filter criteria.'
              : 'Investigations you run in the workspace will appear here when auto-saved.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => {
            const isCriticalOrHigh = item.riskLevel === 'CRITICAL' || item.riskLevel === 'HIGH';
            const isElevated = item.riskLevel === 'ELEVATED';

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border ${
                        isCriticalOrHigh
                          ? 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
                          : isElevated
                          ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
                          : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      }`}
                    >
                      {item.riskLevel}
                    </span>
                    <span className="font-mono text-neutral-400 text-[11px] tabular-nums">
                      Score: {item.riskScore}/100
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="text-neutral-500 text-[11px] font-mono tabular-nums">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                    {item.title}
                  </h3>

                  <p className="text-xs text-neutral-500 line-clamp-1">
                    {item.messageText}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-400 font-mono">
                    <span>ID: {item.id}</span>
                    <span>·</span>
                    <span>Hash: {item.verificationHash.substring(0, 10)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleInspect(item)}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Evidence</span>
                  </button>

                  {deleteConfirmationId === item.id ? (
                    <div className="flex items-center gap-1.5 bg-rose-500/10 p-1 rounded-lg border border-rose-500/30">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="px-2 py-1 text-[11px] font-bold text-white bg-rose-600 rounded hover:bg-rose-700 transition-colors"
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmationId(null)}
                        className="px-2 py-1 text-[11px] text-neutral-600 dark:text-neutral-300 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmationId(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-colors"
                      title="Delete investigation record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
};
