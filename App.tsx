import React, { useState, useEffect } from 'react';
import { Mic, BarChart3, Settings, LogIn, Download, AlertTriangle } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logoutUser } from './services/firebase';
import RecorderWidget from './components/RecorderWidget';
import InsightsDashboard from './components/InsightsDashboard';

enum View {
  RECORDER = 'RECORDER',
  INSIGHTS = 'INSIGHTS'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.RECORDER);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if auth is initialized (config might be missing)
    if (!auth) {
      setLoginError("Firebase configuration missing. Please check .env file.");
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      setAuthLoading(false);
    }, (error) => {
      console.error("Auth State Error:", error);
      setLoginError(error.message);
      setAuthLoading(false);
    });

    // Handle PWA shortcuts
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'INSIGHTS') {
      setCurrentView(View.INSIGHTS);
    } else if (viewParam === 'RECORDER') {
      setCurrentView(View.RECORDER);
    }

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login Failed:", error);
      let msg = "Login failed. Check console for details.";
      if (error.code === 'auth/unauthorized-domain') {
        msg = "Domain not authorized. Add this domain to Firebase Console > Authentication > Settings.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        msg = "Sign-in cancelled.";
      } else if (error.message) {
        msg = error.message;
      }
      setLoginError(msg);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
          <p>Initializing MindVault...</p>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-center">
        <div className="mb-8 p-4 bg-indigo-500/10 rounded-full animate-pulse">
           <Mic className="w-12 h-12 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">MindVault AI</h1>
        <p className="text-slate-400 mb-8 max-w-xs">
          Secure, cloud-synced neural memory for your thoughts.
        </p>
        
        {loginError && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-900 rounded-xl text-red-200 text-sm max-w-xs flex items-start gap-2 text-left">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{loginError}</span>
          </div>
        )}

        <div className="space-y-4 w-full max-w-xs">
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-lg shadow-indigo-500/20"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
          
          {/* Install Button on Auth Screen */}
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-3 bg-slate-800 text-slate-300 px-6 py-3 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700"
            >
              <Download className="w-5 h-5" />
              Install Android App
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950">
      {/* Background Gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto relative z-10 px-4 pt-6">
        {/* User Badge & Install Button */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
           {deferredPrompt && (
             <button 
               onClick={handleInstallClick}
               className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-full font-medium shadow-lg animate-pulse"
             >
               Install App
             </button>
           )}
           <img 
             src={user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
             alt="Profile" 
             className="w-8 h-8 rounded-full border border-slate-700 shadow-md cursor-pointer hover:border-indigo-400 transition-colors"
             onClick={() => {
                if(confirm("Sign out?")) logoutUser();
             }}
           />
        </div>

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