import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Trash2,
  Lock,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { fetchSystemHealth, clearAllCases } from '../services/apiClient.ts';
import type { SystemHealthStatus } from '../types/index.ts';

interface SettingsPageProps {
  onDatabaseCleared?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onDatabaseCleared }) => {
  const { theme, setTheme } = useTheme();
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  useEffect(() => {
    fetchSystemHealth()
      .then(setHealth)
      .catch((err) => console.error('Health load error:', err));
  }, []);

  const handleClearHistory = async () => {
    setIsClearing(true);
    setClearSuccess(null);
    try {
      const count = await clearAllCases();
      setClearSuccess(`Successfully purged ${count} investigation record(s) and audit history.`);
      setShowClearConfirm(false);
      if (onDatabaseCleared) onDatabaseCleared();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('UNAUTHORIZED') || msg.includes('401') || msg.includes('authorization')) {
        alert('Database purge requires investigator authorization. Please authenticate in the Saved Investigations tab first.');
      } else {
        alert('Failed to clear database: ' + msg);
      }
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 text-xs">
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Settings & Forensic Privacy
        </h1>
        <p className="text-neutral-500 text-xs mt-1">
          Configure visual appearance, inspect runtime engine readiness, and manage data retention.
        </p>
      </div>

      {/* Theme Preference */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Visual Theme Preferences
        </h3>
        <p className="text-neutral-500">
          ScamSentry AI adheres to high-contrast WCAG AA accessibility standards across both light and dark themes.
        </p>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { id: 'dark', label: 'Dark Navy', icon: Moon, desc: 'Optimized for low-light cybersecurity consoles' },
            { id: 'light', label: 'Light Neutral', icon: Sun, desc: 'Clean white surfaces for daytime analysis' },
            { id: 'system', label: 'System Default', icon: Laptop, desc: 'Syncs automatically with operating system' }
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = theme === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setTheme(mode.id as any)}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-neutral-900 dark:text-white font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-xs">{mode.label}</span>
                </div>
                <div className="text-[11px] text-neutral-500">{mode.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Engine & Provider Status */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-500" />
            <span>AI Provider & Forensic Extraction Engine</span>
          </h3>
          <span className="font-mono text-neutral-400 text-[11px]">Server-Side Only</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-slate-950/50 space-y-1">
            <span className="text-neutral-400 block text-[10px] font-mono">PRIMARY AI MODEL</span>
            <div className="font-semibold text-neutral-900 dark:text-white font-mono">
              {health?.aiEngine.model || 'gemini-3.8-flash'}
            </div>
            <div className="text-neutral-500 text-[11px]">
              Connected server-side via <code className="font-mono">@google/genai</code> SDK with prompt isolation.
            </div>
          </div>

          <div className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-slate-950/50 space-y-1">
            <span className="text-neutral-400 block text-[10px] font-mono">HEURISTIC FALLBACK STATUS</span>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Deterministic Heuristic Ready</span>
            </div>
            <div className="text-neutral-500 text-[11px]">
              If quota is reached or credentials are unattached, offline rule extraction triggers automatically.
            </div>
          </div>
        </div>
      </div>

      {/* Data Retention & Privacy Management */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-500" />
            <span>Data Retention & Storage Management</span>
          </h3>
          <span className="font-mono text-neutral-400 text-[11px]">Local Atomic Store</span>
        </div>

        <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Cases and audit events are stored locally in an atomic structured JSON database (<code className="font-mono">data/scamsentry_db.json</code>) with SHA-256 payload verification hashes.
          No user-submitted message content is ever sold, used for model training, or transmitted to third-party ad networks.
        </p>

        {clearSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            {clearSuccess}
          </div>
        )}

        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div>
            <div className="font-semibold text-neutral-900 dark:text-white">Clear All Saved History</div>
            <div className="text-neutral-500 text-[11px]">Purge all persisted investigations and audit logs permanently.</div>
          </div>

          {showClearConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
              >
                {isClearing ? 'Purging...' : 'Yes, Delete Everything'}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Database</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
