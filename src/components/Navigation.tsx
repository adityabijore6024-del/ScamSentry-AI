import React from 'react';
import { ShieldAlert, Sun, Moon, Laptop, Bot } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

export type ActiveTab = 'landing' | 'workspace' | 'cases' | 'mcp' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAlexaMode: boolean;
  setIsAlexaMode: (val: boolean) => void;
  savedCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isAlexaMode,
  setIsAlexaMode,
  savedCount = 0
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => setActiveTab('landing')}
          className="flex items-center gap-2.5 text-left text-neutral-900 dark:text-white font-bold tracking-tight text-lg whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-800 flex items-center justify-center border border-neutral-700/40">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <span className="font-semibold tracking-tight">ScamSentry AI</span>
        </button>

        {/* Zone 2: 4-5 Concise Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <button
            onClick={() => setActiveTab('landing')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-neutral-900 dark:hover:text-white ${
              activeTab === 'landing' ? 'text-neutral-900 dark:text-white font-semibold' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-neutral-900 dark:hover:text-white ${
              activeTab === 'workspace' ? 'text-neutral-900 dark:text-white font-semibold' : ''
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 ${
              activeTab === 'cases' ? 'text-neutral-900 dark:text-white font-semibold' : ''
            }`}
          >
            <span>Saved Cases</span>
            {savedCount > 0 && (
              <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                ({savedCount})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-neutral-900 dark:hover:text-white ${
              activeTab === 'mcp' ? 'text-neutral-900 dark:text-white font-semibold' : ''
            }`}
          >
            MCP Inspector
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-neutral-900 dark:hover:text-white ${
              activeTab === 'settings' ? 'text-neutral-900 dark:text-white font-semibold' : ''
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: Actions & Primary Button */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Alexa+ Simulation Mode Toggle */}
          <button
            onClick={() => setIsAlexaMode(!isAlexaMode)}
            title="Simulated Alexa+ Agent Mode (Voice & Turn-by-Turn Guidance)"
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              isAlexaMode
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
                : 'text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Alexa+ Mode</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            aria-label="Toggle visual theme"
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-800 transition-colors"
          >
            {theme === 'system' ? (
              <Laptop className="w-4 h-4" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => setActiveTab('workspace')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors whitespace-nowrap shadow-xs"
          >
            Investigate
          </button>
        </div>
      </div>
    </header>
  );
};
