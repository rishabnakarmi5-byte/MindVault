import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Calendar, MapPin, ArrowUp, User, Sparkles, Activity, AlertTriangle, Layers, Settings, Download, Trash2, X } from 'lucide-react';
import { getEntries, getUserProfile, exportData, clearHistory } from '../services/storage';
import { analyzeHistory } from '../services/gemini';
import { JournalEntry, UserProfile } from '../types';

const InsightsDashboard: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ coreMemories: [], lastUpdated: 0 });
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [loadedEntries, loadedProfile] = await Promise.all([
            getEntries(),
            getUserProfile()
        ]);
        setEntries(loadedEntries);
        setProfile(loadedProfile);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeHistory(entries, query);
      setAnalysisResult(result);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error(error);
      setAnalysisResult("System Error: Could not complete analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = async () => {
    const dataStr = await exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindvault_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    if (confirm("Are you sure? This will delete data available to this device.")) {
      await clearHistory();
      loadData();
      setShowSettings(false);
    }
  };

  const renderValenceBar = (val: number) => {
    // Valence is -1 to 1. Normalize to 0-100%
    const percentage = ((val + 1) / 2) * 100;
    return (
      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 relative overflow-hidden">
        <div 
          className="absolute top-0 bottom-0 transition-all duration-500 rounded-full"
          style={{ 
            left: 0, 
            width: `${percentage}%`,
            background: `linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%)`
          }} 
        />
        {/* Indicator Line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10"
          style={{ left: `${percentage}%` }}
        />
      </div>
    );
  };

  const renderArousalBar = (val: number) => {
    // Arousal is 0 to 1. Normalize to 0-100%
    const percentage = val * 100;
    return (
      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 relative overflow-hidden">
        <div 
          className="absolute top-0 bottom-0 transition-all duration-500 rounded-full bg-gradient-to-r from-blue-500 to-orange-500"
          style={{ width: `${percentage}%` }} 
        />
      </div>
    );
  };

  if (isLoading) {
      return <div className="p-8 text-center text-slate-500 animate-pulse">Syncing neural database...</div>;
  }

  if (showSettings) {
    return (
      <div className="pb-24 w-full max-w-2xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-800 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Data Management</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your data is securely stored in the cloud (Firebase).
            </p>
            <div className="space-y-3">
              <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 rounded-xl text-white font-medium hover:bg-indigo-500 transition-colors">
                <Download className="w-4 h-4" /> Export Data (JSON)
              </button>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-red-900/30">
            <h3 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">Danger Zone</h3>
            <button onClick={handleClear} className="w-full flex items-center justify-center gap-2 p-3 bg-red-950/50 border border-red-900 rounded-xl text-red-400 font-medium hover:bg-red-900/50 transition-colors">
              <Trash2 className="w-4 h-4" /> Wipe Local Cache
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Neural Memory</h2>
          <p className="text-slate-400 text-sm">
            {entries.length} memories accumulated.
          </p>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-800/50 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Core Memory / Profile Section */}
      {profile.coreMemories.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 text-indigo-300">
            <User className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Psych Profile (Persistent)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.coreMemories.map((fact, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 px-3 py-1.5 rounded-lg">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {fact}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Interface */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/50 mb-8 sticky top-4 z-20 shadow-xl">
        <form onSubmit={handleAnalyze} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your psychology (e.g., 'Assess my CBT patterns')"
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={isAnalyzing || !query}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 rounded-lg text-white disabled:opacity-50 disabled:bg-slate-700 hover:bg-indigo-500 transition-colors"
          >
            {isAnalyzing ? (
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </form>

        {/* Analysis Result */}
        {analysisResult && (
          <div ref={scrollRef} className="mt-4 p-4 bg-indigo-950/30 rounded-xl border border-indigo-500/30 animate-fade-in">
            <div className="flex items-center gap-2 mb-2 text-indigo-300">
              <BrainCircuit className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Clinical Assessment</span>
            </div>
            <div className="prose prose-invert prose-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {analysisResult}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <p>No memories recorded yet.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              {/* Header: Date & Location */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                  <span className="w-1 h-1 bg-slate-700 rounded-full" />
                  <MapPin className="w-3 h-3" />
                  <span>{entry.locationName}</span>
                </div>
              </div>
              
              {/* Content Summary */}
              <h4 className="text-sm font-medium text-slate-200 mb-1 line-clamp-1">
                {entry.metadata.summary}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 italic mb-3">
                "{entry.metadata.transcript}"
              </p>

              {/* Psychometrics Grid */}
              {entry.metadata.psychometrics && (
                <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  
                  {/* Russell (1980) Valence/Arousal */}
                  <div className="col-span-2 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Activity className="w-3 h-3 text-cyan-400" />
                      <span>Affect (Russell, 1980)</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Neg</span>
                        <span>Valence</span>
                        <span>Pos</span>
                      </div>
                      {renderValenceBar(entry.metadata.psychometrics.valence)}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Low</span>
                        <span>Arousal</span>
                        <span>High</span>
                      </div>
                      {renderArousalBar(entry.metadata.psychometrics.arousal)}
                    </div>
                  </div>

                  {/* Beck (1976) Distortions */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                      <AlertTriangle className="w-3 h-3 text-orange-400" />
                      <span>CBT Distortions (Beck, 1976)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entry.metadata.psychometrics.cbtDistortions && entry.metadata.psychometrics.cbtDistortions.length > 0 ? (
                        entry.metadata.psychometrics.cbtDistortions.map((d, i) => (
                          <span key={i} className="text-[10px] bg-red-950/40 text-red-300 border border-red-900/40 px-2 py-0.5 rounded">
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-600">None detected</span>
                      )}
                    </div>
                  </div>

                  {/* Maslow (1943) Needs */}
                  <div className="col-span-2 flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Layers className="w-3 h-3 text-purple-400" />
                      <span>Need (Maslow, 1943)</span>
                    </div>
                    <span className="text-[10px] font-medium text-purple-200 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-800/30">
                      {entry.metadata.psychometrics.maslowLevel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InsightsDashboard;