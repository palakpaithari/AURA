
import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Bar, Line, YAxis, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { 
  Activity, Battery, Brain, ShieldCheck, TrendingUp, Radio,
  Lightbulb, Sparkles, Loader2, Plus, Edit3, X, Check, ArrowUpRight, Users, Zap,
  Coffee, Sun, Moon, AlertTriangle, HeartPulse, Palette, Cpu, Flower2, BarChart3,
  Award, RefreshCw, MessageSquare, Trophy, Medal
} from 'lucide-react';
import { UserProfile, PeerTrafficNode, SleepLog, Ritual, MentorImpactAnalysis, Badge } from '../types';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, sendNotification } from '../services/firebase';
import { generateWisdomInsights, analyzeSleepPatterns, generateMentorImpactReport } from '../services/gemini';

// --- STUDENT: PRODUCTIVITY-EMOTION NEXUS (PEN) ---
const ProductivityEmotionNexus = () => {
  const data = [
    { time: '08:00', focus: 30, mood: 60 },
    { time: '10:00', focus: 85, mood: 75 },
    { time: '12:00', focus: 50, mood: 65 },
    { time: '14:00', focus: 90, mood: 50 }, // High focus, mood drops (Burnout risk)
    { time: '16:00', focus: 40, mood: 40 },
    { time: '18:00', focus: 20, mood: 55 },
  ];

  return (
    <div className="glass-panel p-6 rounded-3xl h-full min-h-[300px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Productivity Nexus
        </h3>
        <span className="text-[10px] text-slate-500 uppercase font-bold border border-slate-700 px-2 py-1 rounded-lg">Real-time</span>
      </div>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="focus" barSize={20} fill="url(#colorFocus)" radius={[4, 4, 0, 0]} name="Focus Level" />
            <Line type="monotone" dataKey="mood" stroke="#14b8a6" strokeWidth={3} dot={{r: 4, fill: '#14b8a6'}} name="Internal Weather" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500 mt-2 italic">
        "Your focus peaks at 14:00, but your mood dips. Consider a 15m ritual before this block."
      </p>
    </div>
  );
};

// --- STUDENT: ADAPTIVE RITUALS ENGINE ---
const AdaptiveRituals = () => {
  const [rituals, setRituals] = useState<Ritual[]>([
    { id: '1', title: 'Morning Sunlight', durationMin: 10, type: 'morning', isCompleted: true },
    { id: '2', title: 'Deep Work Primer', durationMin: 5, type: 'deep_work', isCompleted: false },
    { id: '3', title: 'Tech Detox', durationMin: 30, type: 'decompression', isCompleted: false },
  ]);

  const toggleRitual = (id: string) => {
    setRituals(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r));
  };

  return (
    <div className="glass-panel p-6 rounded-3xl h-full min-h-[300px] flex flex-col">
       <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Adaptive Rituals
        </h3>
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        {rituals.map(ritual => (
          <button 
            key={ritual.id}
            onClick={() => toggleRitual(ritual.id)}
            className={`w-full p-3 rounded-xl flex items-center justify-between transition-all border ${
              ritual.isCompleted 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                ritual.isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {ritual.type === 'morning' ? <Sun size={14} /> : ritual.type === 'deep_work' ? <Coffee size={14} /> : <Moon size={14} />}
              </div>
              <div className="text-left">
                <p className={`text-sm font-bold ${ritual.isCompleted ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                  {ritual.title}
                </p>
                <p className="text-[10px] text-slate-500">{ritual.durationMin} min • AI Suggested</p>
              </div>
            </div>
            {ritual.isCompleted && <Check size={16} className="text-emerald-500" />}
          </button>
        ))}
      </div>
      <button className="mt-4 w-full py-2 border border-dashed border-slate-600 rounded-xl text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
        + Add Custom Ritual
      </button>
    </div>
  );
};

// --- SUB-COMPONENT: LIFE LOAD BALANCER ---
const LifeLoadBalancer = ({ user }: { user: UserProfile }) => {
    const [loadData, setLoadData] = useState([
        { subject: 'Academics', A: 50, fullMark: 100 },
        { subject: 'Career', A: 50, fullMark: 100 },
        { subject: 'Social', A: 50, fullMark: 100 },
        { subject: 'Finance', A: 50, fullMark: 100 },
        { subject: 'Health', A: 50, fullMark: 100 },
    ]);
    const [isEditing, setIsEditing] = useState(false);
    const [tempData, setTempData] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'lifeLoads'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docs = snapshot.docs.map(d => d.data());
                docs.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                const data = docs[0];
                setLoadData([
                    { subject: 'Academics', A: data.academics ?? 50, fullMark: 100 },
                    { subject: 'Career', A: data.career ?? 50, fullMark: 100 },
                    { subject: 'Social', A: data.social ?? 50, fullMark: 100 },
                    { subject: 'Finance', A: data.financial ?? 50, fullMark: 100 },
                    { subject: 'Health', A: data.health ?? 50, fullMark: 100 },
                ]);
            }
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleSave = async () => {
        const metric: any = { userId: user.uid, timestamp: serverTimestamp() };
        tempData.forEach(item => {
            const key = item.subject.toLowerCase() === 'finance' ? 'financial' : item.subject.toLowerCase();
            metric[key] = item.A;
        });
        await addDoc(collection(db, 'lifeLoads'), metric);
        setIsEditing(false);
    };

    const startEdit = () => {
        setTempData(loadData.map(item => ({ ...item })));
        setIsEditing(true);
    };

    const updateTemp = (index: number, val: number) => {
        setTempData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], A: val };
            return newData;
        });
    };

    const calculateRisk = (data: any[]) => {
        const avg = data.reduce((acc, curr) => acc + curr.A, 0) / 5;
        if (avg > 80) return { text: 'Critical Burnout Risk', color: 'text-rose-500', bg: 'bg-rose-500/10' };
        if (avg > 60) return { text: 'High Load', color: 'text-orange-500', bg: 'bg-orange-500/10' };
        return { text: 'Balanced', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    };

    const risk = calculateRisk(loadData);

    return (
        <div className="glass-panel rounded-3xl p-6 relative flex flex-col h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                    Life-Load Balancer
                </h3>
                <button 
                    onClick={startEdit} 
                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-violet-500 transition-colors"
                >
                    <Edit3 className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 w-full min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={loadData}>
                        <PolarGrid stroke="#334155" opacity={0.2} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="My Load" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.3} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                    </RadarChart>
                </ResponsiveContainer>
                
                <div className={`absolute bottom-0 right-0 px-3 py-1 rounded-full ${risk.bg} ${risk.color} text-xs font-bold border border-current opacity-80`}>
                    {risk.text}
                </div>
            </div>

            {/* MODAL FOR EDITING */}
            {isEditing && (
                <div className="absolute inset-0 z-20 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md rounded-3xl p-6 flex flex-col animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-slate-900 dark:text-white">Calibrate Load</h4>
                        <button onClick={() => setIsEditing(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><X className="w-5 h-5 text-slate-500" /></button>
                    </div>
                    
                    <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar pr-2">
                        {tempData.map((item, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                    <span className="uppercase tracking-wider">{item.subject}</span>
                                    <span className={`${item.A > 80 ? 'text-rose-500' : 'text-slate-400'}`}>{item.A}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={item.A} 
                                    onChange={(e) => updateTemp(idx, Number(e.target.value))}
                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                                        item.A > 80 ? 'accent-rose-500 bg-rose-500/20' : 
                                        item.A > 50 ? 'accent-orange-500 bg-orange-500/20' : 
                                        'accent-emerald-500 bg-emerald-500/20'
                                    }`}
                                />
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleSave} 
                        className="mt-6 w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <Check className="w-4 h-4" /> Save Calibration
                    </button>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: SLEEP INTELLIGENCE ---
const SleepIntelligence = ({ user }: { user: UserProfile }) => {
    const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
    const [showLogger, setShowLogger] = useState(false);
    const [newHours, setNewHours] = useState(7);
    const [newQuality, setNewQuality] = useState<'good'|'fair'|'poor'>('good');
    const [aiAnalysis, setAiAnalysis] = useState<{debt: number, stressLevel: string, alert: string} | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'sleepLogs'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawLogs = snapshot.docs.map(doc => doc.data() as SleepLog);
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 7);
            const filteredLogs = rawLogs.filter(log => {
                if (!log.timestamp) return false;
                const logDate = new Date(log.timestamp.seconds * 1000);
                return logDate > startOfWeek;
            });
            filteredLogs.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            setSleepLogs(filteredLogs);
        });
        return () => unsubscribe();
    }, [user.uid]);

    useEffect(() => {
        if (sleepLogs.length > 2) {
            const runAnalysis = async () => {
                const result = await analyzeSleepPatterns(sleepLogs);
                if (result) {
                    setAiAnalysis(result);
                    // TRIGGER NOTIFICATION IF STRESS IS HIGH
                    if (['Critical', 'High'].includes(result.stressLevel)) {
                        sendNotification(
                            user.uid,
                            "High Stress Detected",
                            `Sleep debt is impacting your recovery. Strategy: ${result.alert}`,
                            "alert"
                        );
                    }
                }
            };
            runAnalysis();
        }
    }, [sleepLogs, user.uid]);

    const handleAddSleep = async () => {
        await addDoc(collection(db, 'sleepLogs'), {
            userId: user.uid,
            hours: newHours,
            quality: newQuality,
            date: new Date().toISOString().split('T')[0],
            timestamp: serverTimestamp()
        });
        setShowLogger(false);
    };

    const calculateDebt = () => {
        const ideal = 8 * 7;
        const total = sleepLogs.reduce((acc, log) => acc + log.hours, 0);
        if (sleepLogs.length === 0) return 0;
        const avg = total / sleepLogs.length;
        const debt = (8 - avg) * 7; 
        return debt.toFixed(1);
    };

    const debt = aiAnalysis ? aiAnalysis.debt : Number(calculateDebt());

    return (
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between bg-white dark:bg-transparent relative overflow-hidden h-full min-h-[300px] group">
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                        <Battery className="w-5 h-5" />
                        <span className="font-bold tracking-wide text-xs uppercase">Sleep Bank</span>
                    </div>
                    {aiAnalysis ? (
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 rounded-lg border border-violet-500/20">
                             <Sparkles className="w-3 h-3 text-violet-400" />
                             <span className="text-[10px] font-bold text-violet-300">AI Analyzed</span>
                         </div>
                    ) : (
                        <span className={`text-xs font-mono font-bold ${debt > 5 ? 'text-rose-500' : 'text-emerald-400'}`}>
                            {debt > 0 ? `-${debt}h` : '+ Surplus'}
                        </span>
                    )}
                </div>
                
                <div className="h-24 w-full flex items-end justify-between gap-1 mb-2">
                    {sleepLogs.length === 0 && <p className="text-xs text-slate-500 w-full text-center my-auto">No logs yet.</p>}
                    {sleepLogs.slice(-7).map((log, i) => (
                        <div key={i} className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-t-lg relative group h-full flex flex-col justify-end">
                             <div 
                                style={{ height: `${Math.min(100, (log.hours / 10) * 100)}%` }} 
                                className={`w-full rounded-t-lg transition-all ${log.hours < 6 ? 'bg-rose-400' : 'bg-teal-400'} opacity-80 group-hover:opacity-100`}
                             />
                        </div>
                    ))}
                </div>
                
                {aiAnalysis ? (
                    <div className="mt-3 bg-gradient-to-r from-slate-900 to-slate-800 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1">
                             <span className="text-[10px] text-slate-400 uppercase font-bold">Predicted Stress</span>
                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                 aiAnalysis.stressLevel === 'Critical' ? 'bg-rose-500 text-white' :
                                 aiAnalysis.stressLevel === 'High' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
                             }`}>
                                 {aiAnalysis.stressLevel}
                             </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                            "{aiAnalysis.alert}"
                        </p>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 leading-relaxed mt-2">
                        {debt > 10 
                            ? "Critical sleep debt. Cognitive function likely impaired." 
                            : "Maintain this rhythm for optimal neuroplasticity."}
                    </p>
                )}
            </div>
            
            {showLogger ? (
                 <div className="mt-4 bg-slate-800 p-3 rounded-xl border border-slate-700 animate-fade-in z-20 relative">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400">Hours: {newHours}</span>
                        <input type="range" min="3" max="12" step="0.5" value={newHours} onChange={e => setNewHours(Number(e.target.value))} className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                     </div>
                     <div className="flex gap-2 mb-2">
                         {(['good', 'fair', 'poor'] as const).map(q => (
                             <button key={q} onClick={() => setNewQuality(q)} className={`flex-1 text-[10px] py-1 rounded capitalize ${newQuality === q ? 'bg-teal-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                                 {q}
                             </button>
                         ))}
                     </div>
                     <button onClick={handleAddSleep} className="w-full bg-teal-600 hover:bg-teal-500 text-white py-1 rounded-lg text-xs font-bold">Save Log</button>
                 </div>
            ) : (
                <button onClick={() => setShowLogger(true)} className="mt-4 w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-3 h-3" /> Log Sleep
                </button>
            )}
        </div>
    );
};

// --- ACHIEVEMENTS / GAMIFICATION CARD ---
const AchievementsCard = ({ user }: { user: UserProfile }) => {
    const badges = user.badges || [];
    
    return (
        <div className="glass-panel rounded-3xl p-6 bg-gradient-to-br from-amber-500/10 to-transparent dark:from-amber-900/20 border border-amber-500/20 flex flex-col h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Achievements</h3>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/20">
                    <Zap className="w-3 h-3 text-amber-500 fill-current" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{user.streakDays || 0} Day Streak</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {badges.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <Medal className="w-12 h-12 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">No badges earned yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Complete activities to unlock.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {badges.map((badge, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="text-2xl">{badge.icon}</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{badge.name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{badge.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MICRO COMMUNITIES (INTERACTIVE) ---
const MicroCommunities = () => {
    const [joined, setJoined] = useState<string[]>([]);

    const communities = [
        { id: 'art', name: 'Digital Artists', icon: <Palette className="w-5 h-5 text-pink-400"/>, color: 'hover:bg-pink-500/10' },
        { id: 'robotics', name: 'Robotics Club', icon: <Cpu className="w-5 h-5 text-cyan-400"/>, color: 'hover:bg-cyan-500/10' },
        { id: 'mindfulness', name: 'Mindfulness Gen Z', icon: <Flower2 className="w-5 h-5 text-emerald-400"/>, color: 'hover:bg-emerald-500/10' }
    ];

    const toggleJoin = (id: string) => {
        setJoined(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="glass-panel rounded-3xl p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 h-full flex flex-col">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400"/> Micro-Communities
            </h3>
            <div className="space-y-3 flex-1">
                {communities.map(comm => (
                    <button 
                        key={comm.id}
                        onClick={() => toggleJoin(comm.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${comm.color} ${joined.includes(comm.id) ? 'bg-slate-700 border-slate-600' : 'bg-slate-800/50 border-transparent'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-lg">{comm.icon}</div>
                            <span className="text-sm text-slate-200 font-medium">{comm.name}</span>
                        </div>
                        {joined.includes(comm.id) ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Joined</span>
                        ) : (
                            <Plus className="w-4 h-4 text-slate-500" />
                        )}
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-4 text-center">Finding your tribe reduces cortisol by 24%.</p>
        </div>
    );
};

// --- PEER MENTOR STATS (UPDATED WITH AI IMPACT AUDIT) ---
const MentorImpactStats = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [impactData, setImpactData] = useState<MentorImpactAnalysis | null>(null);

  const handleRunAudit = async () => {
    setAnalyzing(true);
    // Simulating fetching recent interactions - normally this would come from Firestore
    const mockInteractions = [
      "I hear that you're stressed about the exam. Have you tried breaking down the chapters?",
      "It's completely normal to feel that way. I failed my first physics test too.",
      "That sounds really heavy. If you're feeling unsafe, please let me know so I can connect you with resources.",
      "You got this! Maybe try the Pomodoro timer in the Flow Zone?"
    ];
    
    // Call Gemini Service
    try {
        const report = await generateMentorImpactReport(mockInteractions);
        setImpactData(report);
    } catch (e) {
        console.error(e);
    } finally {
        setAnalyzing(false);
    }
  };

  const scoreData = impactData ? [{ name: 'Score', value: impactData.score, fill: '#14b8a6' }] : [{ name: 'Score', value: 0, fill: '#334155' }];

  return (
    <div className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-teal-900/20 to-slate-900/20 h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-400" /> Support Impact Score
        </h3>
        <button 
            onClick={handleRunAudit} 
            disabled={analyzing}
            className="text-xs flex items-center gap-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 px-3 py-1.5 rounded-lg border border-teal-500/30 transition-all disabled:opacity-50"
        >
            {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {analyzing ? 'Auditing...' : 'Run Audit'}
        </button>
      </div>

      {!impactData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <HeartPulse className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400">Run an AI audit to analyze your<br/>mentorship effectiveness.</p>
          </div>
      ) : (
          <div className="flex-1 flex flex-col gap-4 animate-fade-in">
              {/* Score Visualization */}
              <div className="flex items-center gap-4">
                  <div className="h-24 w-24 relative flex items-center justify-center flex-shrink-0">
                    {/* Fixed dimensions on chart to prevent ResponsiveContainer -1/-1 error in this specific grid layout */}
                    <RadialBarChart 
                        width={96}
                        height={96}
                        innerRadius="80%" 
                        outerRadius="100%" 
                        barSize={10} 
                        data={scoreData} 
                        startAngle={90} 
                        endAngle={-270}
                    >
                        <RadialBar background dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                          <span className="text-2xl font-bold text-white">{impactData.score}</span>
                          <span className="text-[9px] text-slate-400 uppercase">/ 100</span>
                      </div>
                  </div>
                  <div>
                      <p className="text-xs text-slate-400 uppercase font-bold mb-1">Current Level</p>
                      <p className={`text-xl font-bold ${
                          impactData.level === 'Architect' ? 'text-purple-400' : 
                          impactData.level === 'Guardian' ? 'text-teal-400' : 'text-slate-300'
                      }`}>{impactData.level}</p>
                      {impactData.burnoutWarning && (
                          <div className="flex items-center gap-1 text-rose-400 text-[10px] mt-1 bg-rose-500/10 px-2 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" /> Burnout Risk
                          </div>
                      )}
                  </div>
              </div>

              {/* Actionable Feedback */}
              <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[150px] pr-2">
                  {impactData.strengths.map((str, i) => (
                      <div key={`str-${i}`} className="flex items-start gap-2 text-xs text-slate-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                          <Check className="w-3 h-3 text-emerald-500 mt-0.5" /> {str}
                      </div>
                  ))}
                  {impactData.improvements.map((imp, i) => (
                      <div key={`imp-${i}`} className="flex items-start gap-2 text-xs text-slate-300 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                          <ArrowUpRight className="w-3 h-3 text-orange-500 mt-0.5" /> {imp}
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

// --- PEER MENTOR DASHBOARD (Unchanged Logic, Adjusted Layout) ---
const PeerMentorDashboard = ({ user }: any) => {
    const [wisdom, setWisdom] = useState<{themes: string[], sentiment: number, recommendation: string} | null>(null);
    const [extracting, setExtracting] = useState(false);
    const trafficNodes: PeerTrafficNode[] = [
        { topicId: 'exam-stress', name: 'Exam Stress', velocity: 'critical', activeUsers: 42, sentimentScore: 0.2 },
        { topicId: 'career', name: 'Career Anxiety', velocity: 'high', activeUsers: 28, sentimentScore: 0.4 },
        { topicId: 'lonely', name: 'Loneliness', velocity: 'medium', activeUsers: 15, sentimentScore: 0.3 },
        { topicId: 'wins', name: 'Small Wins', velocity: 'low', activeUsers: 8, sentimentScore: 0.9 },
    ];

    const handleExtractWisdom = async () => {
        setExtracting(true);
        try {
            const q = query(collection(db, 'campfires/exam-stress/messages'), orderBy('timestamp', 'desc'), limit(15));
            const snapshot = await getDocs(q);
            const messages = snapshot.docs.map(doc => doc.data().content);
            const insights = await generateWisdomInsights(messages);
            setWisdom(insights);
        } catch (e) {
            console.error(e);
        } finally {
            setExtracting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-10">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 font-display">Control Tower 🗼</h2>
                <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg">Monitoring <span className="text-teal-500 font-bold">124</span> active students.</p>
                </div>
                <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl w-full md:w-auto">
                    <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span className="text-rose-500 font-bold text-sm">2 Critical Alerts</span>
                </div>
            </div>

            {/* NEW: MENTOR HEALTH & TRAFFIC */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MentorImpactStats />
                <div className="lg:col-span-2 glass-panel p-6 rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-violet-500" />
                        Emotional Traffic Map
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {trafficNodes.map(node => (
                            <div key={node.topicId} className={`p-4 rounded-2xl border relative overflow-hidden ${node.velocity === 'critical' ? 'bg-rose-500/10 border-rose-500/30' : node.velocity === 'high' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <span className="text-xs font-bold text-white leading-tight">{node.name}</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${node.velocity === 'critical' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{node.velocity}</span>
                                </div>
                                <div className="flex items-end gap-2 relative z-10 mt-2">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <span className="text-2xl font-mono text-white">{node.activeUsers}</span>
                                </div>
                                {node.velocity === 'critical' && <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* WISDOM EXTRACTION */}
            <div className="glass-panel p-6 rounded-3xl border-t-4 border-t-violet-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display">
                            <Brain className="w-6 h-6 text-violet-400" />
                            Peer Wisdom Extraction Engine
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Convert chaotic chat logs into anonymized intelligence.</p>
                    </div>
                    <button onClick={handleExtractWisdom} disabled={extracting} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 w-full md:w-auto justify-center">
                        {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {extracting ? 'Processing...' : 'Run Analysis'}
                    </button>
                </div>

                {wisdom && (
                    <div className="bg-gradient-to-br from-violet-600/20 to-slate-800/50 p-5 rounded-2xl border border-violet-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                            <h4 className="text-xs font-bold text-yellow-100 uppercase tracking-wider">AI Strategy</h4>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed italic">"{wisdom.recommendation}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const Dashboard = ({ user, setView }: { user: UserProfile, setView: (v: any) => void }) => {
  const [mood, setMood] = useState<number | null>(null);

  const handleCheckIn = async (score: number) => {
    setMood(score);
    await addDoc(collection(db, 'dailyCheckins'), {
        userId: user.uid,
        score,
        timestamp: serverTimestamp()
    });
  };

  if (user.role === 'peer_mentor') return <PeerMentorDashboard user={user} />;
  
  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-10">
      {/* Header & Identity Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 font-display">
            Hey, {user.displayName.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg">
            Your internal weather forecast looks sunny with a chance of flow.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 transition-all hover:border-violet-500">
                <Brain className="w-3 h-3" />
                <span>Mode: Student</span>
            </button>
            <div className="flex w-full md:w-auto items-center justify-center gap-2 bg-white dark:bg-slate-900/50 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aura Safe Space</span>
            </div>
        </div>
      </div>

      {/* SECTION 1: MOOD & INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-min">
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden group bg-gradient-to-br from-violet-600/5 to-transparent dark:from-transparent min-h-[300px] flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 font-display">How's your internal weather?</h3>
              {!mood ? (
                  <div className="flex justify-between items-center gap-2 md:gap-4">
                      {[1, 2, 3, 4, 5].map((score) => (
                          <button 
                            key={score}
                            onClick={() => handleCheckIn(score)}
                            className="flex-1 aspect-square rounded-2xl bg-white/50 dark:bg-slate-800/50 hover:bg-violet-100 dark:hover:bg-violet-600 hover:scale-105 transition-all flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700/50 group/btn shadow-sm dark:shadow-none"
                          >
                              <span className="text-2xl md:text-3xl mb-1 md:mb-2 grayscale group-hover/btn:grayscale-0 transition-all duration-300">
                                  {score === 1 ? '🌧️' : score === 2 ? '☁️' : score === 3 ? '⛅' : score === 4 ? '☀️' : '🔥'}
                              </span>
                              <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 group-hover/btn:text-violet-700 dark:group-hover/btn:text-white font-medium hidden md:block">
                                  {score === 1 ? 'Heavy' : score === 5 ? 'Flow' : 'Okay'}
                              </span>
                          </button>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-8">
                      <div className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                          <span className="text-4xl">{mood >= 4 ? '☀️' : '⛅'}</span>
                      </div>
                      <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check-in Recorded</h4>
                      <p className="text-slate-600 dark:text-slate-400">"Recognizing the feeling is half the battle."</p>
                  </div>
              )}
          </div>
          <SleepIntelligence user={user} />
      </div>

      {/* SECTION 2: PRODUCTIVITY NEXUS & RITUALS (Using Min-Height instead of fixed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          <div className="lg:col-span-2">
            <ProductivityEmotionNexus />
          </div>
          <div>
             <AdaptiveRituals />
          </div>
      </div>

      {/* SECTION 3: LIFE-LOAD & BRIEF & ACHIEVEMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          <LifeLoadBalancer user={user} />
          <div className="lg:col-span-1">
             <AchievementsCard user={user} />
          </div>
           <div className="lg:col-span-1">
              <MicroCommunities />
           </div>
      </div>
    </div>
  );
};
