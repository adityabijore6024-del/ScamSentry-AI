import React, { useState, useEffect } from 'react';
import { Bot, Volume2, VolumeX, Sparkles, X, ShieldAlert } from 'lucide-react';

interface AlexaSimulatedAgentProps {
  lastNarration?: string | null;
  onClose: () => void;
}

export const AlexaSimulatedAgent: React.FC<AlexaSimulatedAgentProps> = ({
  lastNarration,
  onClose
}) => {
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [history, setHistory] = useState<string[]>([
    "ScamSentry Alexa+ Agent initialized. I'm ready to investigate suspicious messages, verify lookalike domains, and formulate defensive guidance."
  ]);

  useEffect(() => {
    if (lastNarration) {
      setHistory((prev) => [...prev, lastNarration]);

      if (speechEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lastNarration);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [lastNarration, speechEnabled]);

  const toggleSpeech = () => {
    if (speechEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeechEnabled(!speechEnabled);
  };

  return (
    <aside
      aria-label="Simulated Alexa Assistant"
      className="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-amber-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all text-xs"
    >
      <div className="p-3 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-neutral-900 font-bold">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold tracking-tight text-xs">Simulated Alexa+ Assistant</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSpeech}
            className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
            title={speechEnabled ? 'Mute Speech Synthesizer' : 'Enable Speech Synthesizer'}
          >
            {speechEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-500" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 max-h-56 overflow-y-auto space-y-2 select-text">
        {history.slice(-4).map((msg, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-lg leading-relaxed ${
              idx === history.slice(-4).length - 1
                ? 'bg-amber-500/10 text-neutral-900 dark:text-neutral-100 border border-amber-500/20 font-medium'
                : 'text-neutral-500 text-[11px]'
            }`}
          >
            {msg}
          </div>
        ))}
      </div>

      <div className="px-3 py-1.5 bg-neutral-100 dark:bg-slate-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
        <span>Alexa+ Simulated Path</span>
        <span>Speech: {speechEnabled ? 'ON' : 'MUTED'}</span>
      </div>
    </aside>
  );
};
