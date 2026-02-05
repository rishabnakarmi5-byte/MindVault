import React, { useState, useEffect } from 'react';
import { Mic, BarChart3, Settings } from 'lucide-react';
import RecorderWidget from './components/RecorderWidget';
import InsightsDashboard from './components/InsightsDashboard';

enum View {
  RECORDER = 'RECORDER',
  INSIGHTS = 'INSIGHTS'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.RECORDER);

  useEffect(() => {
    // Handle PWA shortcuts or deep links
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'INSIGHTS') {
      setCurrentView(View.INSIGHTS);
    } else if (viewParam === 'RECORDER') {
      setCurrentView(View.RECORDER);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950">
      {/* Background Gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto relative z-10 px-4 pt-6">
        {currentView === View.RECORDER && (
          <RecorderWidget onEntrySaved={() => setCurrentView(View.INSIGHTS)} />
        )}
        {currentView === View.INSIGHTS && (
          <InsightsDashboard />
        )}
      </main>

      {/* Bottom Navigation Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <nav className="glass-panel px-6 py-3 rounded-full border border-slate-700/50 shadow-2xl flex items-center gap-8">
          <button 
            onClick={() => setCurrentView(View.RECORDER)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.RECORDER ? 'text-cyan-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Mic className="w-6 h-6" />
            <span className="text-[10px] font-medium">Record</span>
          </button>
          
          <div className="w-px h-8 bg-slate-800" />

          <button 
            onClick={() => setCurrentView(View.INSIGHTS)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.INSIGHTS ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-medium">Memory</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;