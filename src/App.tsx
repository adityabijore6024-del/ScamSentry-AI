import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Navigation, type ActiveTab } from './components/Navigation.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { InvestigationWorkspace } from './components/InvestigationWorkspace.tsx';
import { InvestigationResults } from './components/InvestigationResults.tsx';
import { SavedCasesPage } from './components/SavedCasesPage.tsx';
import { McpInspectorPage } from './components/McpInspectorPage.tsx';
import { SettingsPage } from './components/SettingsPage.tsx';
import { IncidentReportModal } from './components/IncidentReportModal.tsx';
import { AlexaSimulatedAgent } from './components/AlexaSimulatedAgent.tsx';
import { fetchCases, isSessionActive } from './services/apiClient.ts';
import type { InvestigationExecutionPlan } from './types/index.ts';
import type { SampleTestCase } from './data/sampleCases.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('landing');
  const [selectedSample, setSelectedSample] = useState<SampleTestCase | null>(null);
  const [currentPlan, setCurrentPlan] = useState<InvestigationExecutionPlan | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAlexaMode, setIsAlexaMode] = useState<boolean>(false);
  const [alexaNarration, setAlexaNarration] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number>(0);

  // Sync saved count on mount
  useEffect(() => {
    // Saved cases are private. Do not call the protected API until a session exists.
    if (!isSessionActive()) {
      setSavedCount(0);
      return;
    }
    let cancelled = false;
    fetchCases({ limit: 1 })
      .then((data) => { if (!cancelled) setSavedCount(data.total); })
      .catch(() => { if (!cancelled) setSavedCount(0); });
    return () => { cancelled = true; };
  }, []);

  const handleSelectSample = (sample: SampleTestCase) => {
    setSelectedSample(sample);
    setActiveTab('workspace');
    if (isAlexaMode) {
      setAlexaNarration(`Loaded preset investigation: ${sample.title}. Ready to analyze.`);
    }
  };

  const handleInvestigationComplete = (plan: InvestigationExecutionPlan) => {
    setCurrentPlan(plan);
    // Only refresh private case count for authenticated sessions. Public investigations
    // are intentionally ephemeral and should not trigger a 401 request.
    if (isSessionActive()) {
      fetchCases({ limit: 1 })
        .then((data) => setSavedCount(data.total))
        .catch(() => {});
    }
  };

  const handleOpenCase = (plan: InvestigationExecutionPlan) => {
    setCurrentPlan(plan);
    setActiveTab('workspace');
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-slate-950 text-neutral-900 dark:text-neutral-100 transition-colors">
        {/* Navigation Bar */}
        <Navigation
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isAlexaMode={isAlexaMode}
          setIsAlexaMode={setIsAlexaMode}
          savedCount={savedCount}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {activeTab === 'landing' && (
            <LandingPage
              onSelectSample={handleSelectSample}
              onOpenWorkspace={() => setActiveTab('workspace')}
              onOpenMcp={() => setActiveTab('mcp')}
            />
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-10">
              {currentPlan ? (
                <InvestigationResults
                  plan={currentPlan}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                  onBackToWorkspace={() => setCurrentPlan(null)}
                />
              ) : (
                <InvestigationWorkspace
                  initialSample={selectedSample}
                  onInvestigationComplete={handleInvestigationComplete}
                  isAlexaMode={isAlexaMode}
                  onAlexaNarrate={(text) => setAlexaNarration(text)}
                />
              )}
            </div>
          )}

          {activeTab === 'cases' && (
            <SavedCasesPage
              onOpenCase={handleOpenCase}
              onRefreshCount={(c) => setSavedCount(c)}
            />
          )}

          {activeTab === 'mcp' && <McpInspectorPage />}

          {activeTab === 'settings' && (
            <SettingsPage
              onDatabaseCleared={() => setSavedCount(0)}
            />
          )}
        </main>

        {/* Incident Report Modal */}
        {isReportModalOpen && currentPlan && (
          <IncidentReportModal
            plan={currentPlan}
            onClose={() => setIsReportModalOpen(false)}
          />
        )}

        {/* Alexa+ Simulated Assistant Mode Widget */}
        {isAlexaMode && (
          <AlexaSimulatedAgent
            lastNarration={alexaNarration}
            onClose={() => setIsAlexaMode(false)}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
