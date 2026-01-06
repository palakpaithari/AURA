import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '../types';
import { Sparkles, Shield, User, Users, Lock, ArrowRight, Loader2, Mail } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('student');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const ADMIN_SECRET = "GDG_AURA_2025"; // Demo-safe hardcoded key

  const createProfile = async (user: any, selectedRole: UserRole) => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // New User - Create Profile
      const initialStatus = selectedRole === 'peer_mentor' ? 'pending' : 'active';
      
      await setDoc(docRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || name || 'Aura Member',
        photoURL: user.photoURL,
        role: selectedRole,
        status: initialStatus,
        createdAt: serverTimestamp(),
        authProvider: user.providerData[0]?.providerId || 'email',
        streakDays: 0
      });
    }
  };

  const handleGoogleAuth = async () => {
    if (!isLogin && role === 'admin' && adminKey !== ADMIN_SECRET) {
      alert("Invalid Admin Key");
      return;
    }

    setLoading(true);
    try {
      const result = await auth.signInWithPopup(googleProvider);
      // If signing up, enforce the selected role. If logging in, the profile already exists.
      // For simplicity in this hybrid flow, we check if doc exists inside createProfile.
      await createProfile(result.user, role);
      onLoginSuccess();
    } catch (error: any) {
      console.error("Auth Error", error);
      if (error.code === 'auth/operation-not-supported-in-this-environment') {
        alert("Authentication requires HTTP or HTTPS. Please serve this app via a web server (e.g., localhost), not directly from the file system.");
      } else {
        alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && role === 'admin' && adminKey !== ADMIN_SECRET) {
        alert("Invalid Admin Key");
        return;
    }

    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await auth.signInWithEmailAndPassword(email, password);
      } else {
        userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // Set Display Name
        if (userCredential.user) {
             // We manually update profile for email users
             await createProfile(userCredential.user, role);
        }
      }
      onLoginSuccess();
    } catch (error: any) {
      console.error("Auth Error", error);
      if (error.code === 'auth/email-already-in-use') {
          alert("This email is already registered. Please Sign In instead.");
          setIsLogin(true);
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        alert("Authentication requires HTTP or HTTPS. Please serve this app via a web server (e.g., localhost).");
      } else {
          alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center relative overflow-hidden font-sans p-4">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-900/30 via-[#0f172a] to-[#0f172a]"></div>
      
      <div className="z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        
        {/* Left Side: Brand (Visible on Desktop) */}
        <div className="hidden lg:block space-y-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/30 animate-float">
                <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
                <h1 className="text-5xl font-bold text-white mb-4 font-display tracking-tight">
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-teal-400">Aura</span>
                </h1>
                <p className="text-xl text-slate-400 leading-relaxed">
                    The invisible OS for your well-being. <br/>
                    Whether you're here to focus, reflect, or help others, you belong.
                </p>
            </div>
            <div className="flex gap-4">
                <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
                    <Shield className="w-5 h-5 text-teal-400" />
                    <span className="text-slate-300 text-sm">Private & Secure</span>
                </div>
                <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
                    <Users className="w-5 h-5 text-violet-400" />
                    <span className="text-slate-300 text-sm">Peer Supported</span>
                </div>
            </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative w-full">
            {/* Mobile Branding */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-teal-400 rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                 </div>
                 <h1 className="text-3xl font-bold text-white font-display">Aura</h1>
            </div>

            <div className="mb-6 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Sign In' : 'Create Account'}</h2>
                <p className="text-slate-400 text-sm">
                    {isLogin ? "Welcome back to your headspace." : "Join the ecosystem today."}
                </p>
            </div>

            {/* Role Selector (Only visible on Signup) */}
            {!isLogin && (
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <button 
                        onClick={() => setRole('student')}
                        className={`p-2 md:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 md:gap-2 transition-all ${role === 'student' ? 'bg-violet-600/20 border-violet-500 text-white' : 'border-slate-700 text-slate-500 hover:bg-slate-800'}`}
                    >
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="text-[10px] md:text-xs font-bold">Student</span>
                    </button>
                    <button 
                        onClick={() => setRole('peer_mentor')}
                        className={`p-2 md:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 md:gap-2 transition-all ${role === 'peer_mentor' ? 'bg-teal-600/20 border-teal-500 text-white' : 'border-slate-700 text-slate-500 hover:bg-slate-800'}`}
                    >
                        <Users className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="text-[10px] md:text-xs font-bold text-center leading-tight">Peer Mentor</span>
                    </button>
                    <button 
                        onClick={() => setRole('admin')}
                        className={`p-2 md:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 md:gap-2 transition-all ${role === 'admin' ? 'bg-rose-600/20 border-rose-500 text-white' : 'border-slate-700 text-slate-500 hover:bg-slate-800'}`}
                    >
                        <Shield className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="text-[10px] md:text-xs font-bold">Admin</span>
                    </button>
                </div>
            )}

            {/* Dynamic Role Info */}
            {!isLogin && role === 'peer_mentor' && (
                <div className="mb-6 p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg text-xs text-teal-300 flex items-start gap-2">
                    <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Peer Mentor accounts require Admin approval before accessing the platform.
                </div>
            )}

            {!isLogin && role === 'admin' && (
                <div className="mb-6">
                    <label className="block text-xs text-rose-400 mb-2 font-bold uppercase tracking-wider">
                        Admin Access Key
                    </label>
                    <input 
                        type="password"
                        className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500 transition-colors"
                        placeholder="Enter secret key..."
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                    />
                </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
                {!isLogin && (
                    <div className="group">
                        <label className="block text-xs text-slate-500 mb-1 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                            <input 
                                type="text"
                                required
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-violet-500 transition-colors"
                                placeholder="Jane Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                )}
                
                <div className="group">
                    <label className="block text-xs text-slate-500 mb-1 ml-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                        <input 
                            type="email"
                            required
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-violet-500 transition-colors"
                            placeholder="student@university.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div className="group">
                    <label className="block text-xs text-slate-500 mb-1 ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                        <input 
                            type="password"
                            required
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-violet-500 transition-colors"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                </button>
            </form>

            <div className="mt-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-700/50" />
                <span className="text-xs text-slate-500">OR</span>
                <div className="h-px flex-1 bg-slate-700/50" />
            </div>

            <button 
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full mt-6 bg-white hover:bg-slate-100 text-slate-900 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continue with Google
            </button>

            <p className="mt-6 text-center text-sm text-slate-400">
                {isLogin ? "New here?" : "Already have an account?"}
                <button 
                    onClick={() => setIsLogin(!isLogin)} 
                    className="ml-2 text-violet-400 hover:text-violet-300 font-bold underline decoration-violet-500/30 hover:decoration-violet-400"
                >
                    {isLogin ? "Create Account" : "Sign In"}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};