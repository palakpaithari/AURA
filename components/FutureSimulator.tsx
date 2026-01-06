import React, { useState } from 'react';
import { UserProfile, FutureScenario } from '../types';
import { generateFutureSelf } from '../services/gemini';
import { 
    Compass, Sparkles, ArrowRight, Loader2, RotateCcw, 
    Target, BookOpen, AlertTriangle, TrendingUp, Anchor, Rocket
} from 'lucide-react';

export const FutureSimulator = ({ user }: { user: UserProfile }) => {
    const [step, setStep] = useState<'intro' | 'input' | 'processing' | 'results'>('intro');
    const [inputs, setInputs] = useState({ major: '', goal: '', obstacle: '' });
    const [scenarios, setScenarios] = useState<FutureScenario[]>([]);

    const handleSimulate = async () => {
        if (!inputs.major || !inputs.goal || !inputs.obstacle) return;
        setStep('processing');
        // Minimum delay to show the animation
        const [results] = await Promise.all([
            generateFutureSelf(inputs),
            new Promise(resolve => setTimeout(resolve, 2000))
        ]);
        setScenarios(results);
        setStep('results');
    };

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'stable': return <Anchor className="w-6 h-6 text-emerald-400" />;
            case 'growth': return <TrendingUp className="w-6 h-6 text-violet-400" />;
            case 'moonshot': return <Rocket className="w-6 h-6 text-orange-400" />;
            default: return <Sparkles className="w-6 h-6" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'stable': return 'from-emerald-900/40 to-teal-900/20 border-emerald-500/30';
            case 'growth': return 'from-violet-900/40 to-purple-900/20 border-violet-500/30';
            case 'moonshot': return 'from-orange-900/40 to-rose-900/20 border-orange-500/30';
            default: return 'from-slate-800 to-slate-900';
        }
    };

    return (
        <div className={`w-full max-w-6xl mx-auto flex flex-col transition-all duration-500 ${step === 'results' ? 'justify-start pt-0' : 'justify-center min-h-[80vh]'}`}>
            
            {/* INTRO STEP */}
            {step === 'intro' && (
                <div className="text-center space-y-6 animate-fade-in max-w-lg mx-auto px-4">
                    <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]">
                        <Compass className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-display">Temporal Simulator</h2>
                    <p className="text-base md:text-lg text-slate-400 leading-relaxed">
                        Anxiety often comes from a narrowed view of the future. 
                        Let Aura's AI project three distinct probability streams to validate your resilience.
                    </p>
                    <button 
                        onClick={() => setStep('input')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 mx-auto transition-all hover:scale-105 w-full md:w-auto"
                    >
                        Begin Simulation <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* INPUT STEP */}
            {step === 'input' && (
                <div className="w-full max-w-xl mx-auto glass-panel p-6 md:p-8 rounded-3xl animate-fade-in border border-slate-700/50 shadow-2xl">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Target className="w-6 h-6 text-indigo-400" /> Define Parameters
                    </h3>
                    
                    <div className="space-y-5">
                        <div className="group">
                            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2 group-focus-within:text-indigo-400 transition-colors">
                                <BookOpen className="w-4 h-4" /> Current Major / Field
                            </label>
                            <input 
                                value={inputs.major}
                                onChange={e => setInputs({...inputs, major: e.target.value})}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors"
                                placeholder="e.g. Computer Science"
                                autoFocus
                            />
                        </div>
                        
                        <div className="group">
                            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2 group-focus-within:text-indigo-400 transition-colors">
                                <Sparkles className="w-4 h-4" /> Ideal Career Goal
                            </label>
                            <input 
                                value={inputs.goal}
                                onChange={e => setInputs({...inputs, goal: e.target.value})}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors"
                                placeholder="e.g. Ethical AI Researcher"
                            />
                        </div>

                        <div className="group">
                            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2 group-focus-within:text-rose-400 transition-colors">
                                <AlertTriangle className="w-4 h-4" /> The "Blocker" (Your current anxiety)
                            </label>
                            <input 
                                value={inputs.obstacle}
                                onChange={e => setInputs({...inputs, obstacle: e.target.value})}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500 transition-colors"
                                placeholder="e.g. Failing Advanced Calculus"
                            />
                        </div>

                        <button 
                            onClick={handleSimulate}
                            disabled={!inputs.major || !inputs.goal || !inputs.obstacle}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate Timelines
                        </button>
                    </div>
                </div>
            )}

            {/* PROCESSING STEP */}
            {step === 'processing' && (
                <div className="text-center animate-pulse px-4">
                    <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Calculating Trajectories...</h3>
                    <p className="text-slate-400">Consulting probability engine based on your resilience profile.</p>
                </div>
            )}

            {/* RESULTS STEP */}
            {step === 'results' && (
                <div className="w-full animate-fade-in flex flex-col pb-24 lg:pb-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 px-1">
                        <div>
                            <h2 className="text-3xl font-bold text-white font-display mb-2">Probable Futures</h2>
                            <p className="text-slate-400 text-sm md:text-base">Three valid paths forward. None of them end at the obstacle.</p>
                        </div>
                        <button 
                            onClick={() => setStep('input')}
                            className="w-full md:w-auto text-sm text-slate-500 hover:text-white flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 md:bg-transparent rounded-xl hover:bg-slate-800 transition-colors border border-slate-700 md:border-transparent"
                        >
                            <RotateCcw className="w-4 h-4" /> New Simulation
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {scenarios.map((scen, idx) => (
                            <div 
                                key={idx} 
                                className={`glass-panel p-6 md:p-8 rounded-3xl border bg-gradient-to-br ${getTypeColor(scen.type)} relative overflow-hidden flex flex-col`}
                            >
                                {/* Background Ambient Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="p-3 bg-slate-900/60 rounded-2xl backdrop-blur-md shadow-lg border border-white/5">
                                        {getTypeIcon(scen.type)}
                                    </div>
                                    <span className="text-4xl font-bold text-white/10 font-display">0{idx + 1}</span>
                                </div>

                                <div className="mb-6 relative z-10">
                                    <h3 className="text-xl font-bold text-white mb-1">{scen.title}</h3>
                                    <p className="text-xs uppercase tracking-wider font-bold opacity-70 text-slate-300">{scen.type} Trajectory</p>
                                </div>
                                
                                <div className="flex-grow mb-8 relative z-10">
                                    <p className="text-slate-200 text-sm leading-relaxed bg-slate-900/30 p-4 rounded-xl border border-white/5">
                                        "{scen.narrative}"
                                    </p>
                                </div>

                                <div className="space-y-4 relative z-10 mt-auto">
                                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/10 flex items-center gap-3">
                                        <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Key Milestone</p>
                                            <p className="text-sm font-bold text-white line-clamp-1">{scen.keyMilestone}</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                                            <span>Probability Score</span>
                                            <span>{scen.confidenceScore}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                    scen.type === 'stable' ? 'bg-emerald-400' :
                                                    scen.type === 'growth' ? 'bg-violet-400' : 'bg-orange-400'
                                                }`}
                                                style={{ width: `${scen.confidenceScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};