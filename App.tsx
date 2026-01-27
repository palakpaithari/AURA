
import React, { useState, useEffect } from 'react';
import { auth, logout, db } from './services/firebase';
import firebase from 'firebase/compat/app';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Journal } from './components/Journal';
import { Campfire } from './components/Campfire'; 
import { FocusZone } from './components/FocusZone'; 
import { FutureSimulator } from './components/FutureSimulator';
import { MicroCommunities } from './components/MicroCommunities';
import { AdminPanel } from './components/AdminPanel';
import { AICompanion } from './components/AICompanion';
import { ViewState, UserProfile } from './types';
import { initGemini } from './services/gemini';
import { Loader2, Lock, CheckCircle, AlertCircle, Moon, Sun } from 'lucide-react';

export const App = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState['view']>('dashboard');
  const [isAiActive, setIsAiActive] = useState(true); // Default true now
  const [loading, setLoading] = useState(true);
  
  // Theme Stat
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return (saved === 'dark' || saved === 'light') ? saved : 'dark';
    }
    return 'dark';
  });

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Auth State Listner
  useEffect(() => {
    // Initialize AI immediately
    initGemini();

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Real-time listener for profile changes
        const profileUnsub = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
             if (docSnap.exists()) {
                 setUserProfile(docSnap.data() as UserProfile);
             } else {
                 setLoading(false);
             }
             setLoading(false);
        });
        
        return () => profileUnsub();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
      return <div className="h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center text-violet-500"><Loader2 className="animate-spin w-10 h-10" /></div>;
  }

  // --- UNAUTHENTICATED ---
  if (!user || !userProfile) {
      return <Auth onLoginSuccess={() => setLoading(true)} />;
  }

  // --- PENDING APPROVAL (Peer Mentors) ---
  if (userProfile.status === 'pending') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center p-6 text-center">
              <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-teal-500/30">
                  <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock className="w-8 h-8 text-teal-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Pending Approval</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Your <strong>Peer Mentor</strong> account is currently being reviewed by an Administrator. 
                      You will gain access once verified.
                  </p>
                  <button onClick={logout} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors">
                      Sign Out
                  </button>
              </div>
          </div>
      );
  }

  // --- SUSPENDED ---
  if (userProfile.status === 'suspended') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center p-6 text-center">
               <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-rose-500/30">
                   <h2 className="text-2xl font-bold text-rose-500 mb-2">Account Suspended</h2>
                   <p className="text-slate-600 dark:text-slate-400 mb-6">Please contact support for more information.</p>
                   <button onClick={logout} className="text-slate-500 hover:text-slate-700 dark:hover:text-white">Sign Out</button>
               </div>
          </div>
      )
  }

  // --- MAIN APP ---
  return (
    <>
        <Layout 
            user={userProfile} 
            currentView={view} 
            setView={setView} 
            onLogout={logout}
        >
            {view === 'dashboard' && <Dashboard user={userProfile} setView={setView} />}
            {view === 'ai_companion' && <AICompanion user={userProfile} />}
            {view === 'reflect' && <Journal user={userProfile} />}
            {view === 'campfire' && <Campfire user={userProfile} />}
            {view === 'communities' && <MicroCommunities user={userProfile} />}
            {view === 'flow' && <FocusZone user={userProfile} />}
            {view === 'future' && <FutureSimulator user={userProfile} />}
            {view === 'admin_panel' && userProfile.role === 'admin' && <AdminPanel />}
            
            {view === 'settings' && (
                <div className="max-w-xl mx-auto mt-10 animate-fade-in">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Aura Configuration</h2>
                     <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                        
                        {/* Theme Toggle */}
                        <div className="flex justify-between items-center mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
                             <div>
                                 <label className="block text-lg font-bold text-slate-900 dark:text-white">Appearance</label>
                                 <p className="text-sm text-slate-500">Choose your preferred interface theme.</p>
                             </div>
                             <button 
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="relative inline-flex h-10 w-20 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none"
                             >
                                 <span className="sr-only">Toggle Theme</span>
                                 <span 
                                     className={`${theme === 'dark' ? 'translate-x-11' : 'translate-x-1'} inline-block h-8 w-8 transform rounded-full bg-white shadow transition-transform flex items-center justify-center text-slate-900`}
                                 >
                                     {theme === 'dark' ? <Moon size={16} className="text-violet-600" /> : <Sun size={16} className="text-orange-500" />}
                                 </span>
                             </button>
                        </div>

                        {/* AI Status (Key is now handled internally) */}
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-bold text-slate-900 dark:text-white">Aura AI System</label>
                            <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-bold">
                                <CheckCircle className="w-3 h-3 mr-1" /> Active & Online
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            Aura AI is pre-configured and ready. It powers real-time chat moderation, journal sentiment analysis, and predictive sleep insights using Google Gemini 2.0 Flash.
                        </p>
                        
                        {/* Admin Only Controls Mockup */}
                        {userProfile.role === 'admin' && (
                            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="text-slate-900 dark:text-white font-bold mb-4">Admin Controls</h3>
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">System Status</p>
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400">Normal</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Pending Approvals</p>
                                        <span className="text-xs text-slate-900 dark:text-white">0</span>
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>
                </div>
            )}
        </Layout>
    </>
  );
};
