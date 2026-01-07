
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Zap, Brain, Radio, Users, Target, Coffee, Wind, Check, Edit2 } from 'lucide-react';
import { UserProfile } from '../types';
import { updateGamification } from '../services/gamification';

// --- AUDIO ENGINE (Web Audio API) ---
class SoundEngine {
  ctx: AudioContext | null = null;
  oscillators: any[] = [];
  gainNode: GainNode | null = null;
  isPlaying: boolean = false;
  type: 'binaural' | 'brownNoise' | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = 0.1;
    }
    if (this.ctx.state === 'suspended') {
        this.ctx.resume();
    }
  }

  stop() {
    this.oscillators.forEach(osc => {
      try { 
          // Ramp down to avoid clicking
          if(this.gainNode) {
              this.gainNode.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
          }
          setTimeout(() => osc.stop(), 150);
      } catch (e) {}
    });
    this.oscillators = [];
    this.isPlaying = false;
    this.type = null;
  }

  playBinaural(volume: number) {
    this.init();
    if (this.isPlaying) this.stop();
    this.type = 'binaural';
    this.isPlaying = true;
    
    // Ramp up volume
    this.gainNode!.gain.setValueAtTime(0, this.ctx!.currentTime);
    this.gainNode!.gain.linearRampToValueAtTime(volume, this.ctx!.currentTime + 1);

    // 40Hz Gamma Waves (Focus)
    const createOsc = (freq: number, pan: number) => {
      const osc = this.ctx!.createOscillator();
      const panner = this.ctx!.createStereoPanner();
      osc.frequency.value = freq;
      osc.connect(panner);
      panner.pan.value = pan;
      panner.connect(this.gainNode!);
      osc.start();
      this.oscillators.push(osc);
    };

    createOsc(200, -1); // Left ear
    createOsc(240, 1);  // Right ear (40Hz difference)
  }

  playBrownNoise(volume: number) {
    this.init();
    if (this.isPlaying) this.stop();
    this.type = 'brownNoise';
    this.isPlaying = true;

    this.gainNode!.gain.setValueAtTime(0, this.ctx!.currentTime);
    this.gainNode!.gain.linearRampToValueAtTime(volume, this.ctx!.currentTime + 1);

    const bufferSize = this.ctx!.sampleRate * 2;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(this.gainNode!);
    noise.start();
    this.oscillators.push(noise);
  }

  setVolume(val: number) {
    if (this.gainNode && this.ctx) {
        this.gainNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }
  }
}

const audioPlayer = new SoundEngine();

export const FocusZone = ({ user }: { user?: UserProfile }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [soundMode, setSoundMode] = useState<'off' | 'binaural' | 'noise'>('off');
  const [volume, setVolume] = useState(0.15);
  
  // Group Flow State
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [peerCount, setPeerCount] = useState(128);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Intent State
  const [intent, setIntent] = useState('');
  const [isIntentSet, setIsIntentSet] = useState(false);

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Gamification Trigger on Success
      if (mode === 'focus' && user) {
          updateGamification(user.uid, 'focus');
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, user]);

  // Audio Logic
  useEffect(() => {
    if (soundMode === 'binaural') audioPlayer.playBinaural(volume);
    else if (soundMode === 'noise') audioPlayer.playBrownNoise(volume);
    else audioPlayer.stop();

    return () => audioPlayer.stop(); 
  }, [soundMode]);

  useEffect(() => {
    audioPlayer.setVolume(volume);
  }, [volume]);

  // Group Simulation Logic
  useEffect(() => {
      if (isGroupMode) {
          setConnectionStatus('connecting');
          setTimeout(() => {
              setConnectionStatus('connected');
          }, 1500);
          
          const interval = setInterval(() => {
              setPeerCount(prev => prev + Math.floor(Math.random() * 5) - 2);
          }, 4000);
          return () => clearInterval(interval);
      } else {
          setConnectionStatus('disconnected');
      }
  }, [isGroupMode]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
      setMode(newMode);
      setIsActive(false);
      setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
      // Auto switch sound preset
      if (newMode === 'break' && soundMode === 'binaural') setSoundMode('off'); 
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // UI Theme Helpers
  const isFocus = mode === 'focus';
  const themeColor = isFocus ? 'violet' : 'amber';
  const ThemeIcon = isFocus ? Zap : Coffee;

  // SVG Calculation
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progress = timeLeft / totalTime;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-50 dark:bg-[#0f172a]">
        
        {/* Dynamic Ambient Background (Fixed behind scroll area) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full blur-[100px] md:blur-[120px] transition-all duration-[3000ms] ${
                isFocus 
                ? isActive ? 'bg-violet-600/20 scale-110' : 'bg-violet-900/20 scale-100'
                : isActive ? 'bg-amber-500/20 scale-110' : 'bg-amber-700/10 scale-100'
            }`} />
        </div>

        {/* Scrollable Content Container */}
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
            <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
                
                <div className="w-full max-w-lg flex flex-col gap-6 my-auto">

                    {/* TOP BAR: GROUP MODE & INTENT */}
                    <div className="flex justify-between items-start">
                        {/* Group Toggle */}
                        <button 
                        onClick={() => setIsGroupMode(!isGroupMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                            isGroupMode 
                            ? 'bg-slate-800 text-teal-400 border-teal-500/50 shadow-[0_0_15px_-3px_rgba(45,212,191,0.3)]' 
                            : 'bg-slate-900/50 text-slate-500 border-slate-700 hover:border-slate-600'
                        }`}
                        >
                            <Users size={14} />
                            {connectionStatus === 'connecting' ? (
                                <span className="animate-pulse">Syncing...</span>
                            ) : connectionStatus === 'connected' ? (
                                <span>{peerCount} Connected</span>
                            ) : (
                                <span>Solo Mode</span>
                            )}
                        </button>

                        {/* Intent Display (Mini) if set */}
                        {isIntentSet && (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300 text-sm font-medium animate-fade-in bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                                <Target className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                                <span className="truncate max-w-[150px]">{intent}</span>
                                <button onClick={() => setIsIntentSet(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* MAIN CARD */}
                    <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden transition-all duration-500">
                        
                        {/* Intent Setting Overlay */}
                        {!isIntentSet && (
                            <div className="absolute inset-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                                <Target className="w-12 h-12 text-violet-500 dark:text-violet-400 mb-4" />
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">What is your mission?</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Defining a clear goal triggers flow 30% faster.</p>
                                <input 
                                    type="text" 
                                    value={intent}
                                    onChange={(e) => setIntent(e.target.value)}
                                    placeholder="e.g. Finish History Essay"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-center mb-4 focus:border-violet-500 outline-none transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && intent && setIsIntentSet(true)}
                                />
                                <div className="flex gap-3 w-full">
                                    <button 
                                        onClick={() => setIsIntentSet(true)} 
                                        className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-sm"
                                    >
                                        Skip
                                    </button>
                                    <button 
                                        onClick={() => intent && setIsIntentSet(true)} 
                                        disabled={!intent}
                                        className="flex-[2] bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Commit
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Header: Mode Switcher */}
                        <div className="flex justify-center mb-6 md:mb-8 relative z-10">
                            <div className="bg-slate-200 dark:bg-slate-900/50 p-1.5 rounded-full flex relative shadow-inner">
                                {/* Sliding Pill Background */}
                                <div className={`absolute top-1.5 bottom-1.5 w-[50%] rounded-full transition-all duration-300 shadow-sm ${isFocus ? 'left-1.5 bg-violet-600' : 'left-[calc(50%-6px)] bg-amber-500 translate-x-[6px]'}`} />
                                
                                <button 
                                    onClick={() => switchMode('focus')}
                                    className={`relative z-10 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${isFocus ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    Focus
                                </button>
                                <button 
                                    onClick={() => switchMode('break')}
                                    className={`relative z-10 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${!isFocus ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    Break
                                </button>
                            </div>
                        </div>

                        {/* Timer Visualization - Responsive Sizing */}
                        <div className="relative w-56 h-56 md:w-72 md:h-72 mx-auto mb-8 md:mb-10 flex items-center justify-center">
                            {/* Pulsing Glow Layer */}
                            <div className={`absolute inset-0 rounded-full blur-[30px] md:blur-[40px] transition-all duration-1000 ${
                                isActive 
                                ? isFocus ? 'bg-violet-500/30 scale-110 animate-pulse-slow' : 'bg-amber-500/30 scale-110 animate-pulse-slow'
                                : 'bg-transparent scale-100'
                            }`} />

                            <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 260 260">
                                {/* Background Track */}
                                <circle cx="130" cy="130" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-800" />
                                {/* Progress Track */}
                                <circle 
                                    cx="130" cy="130" r={radius} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    strokeLinecap="round"
                                    strokeDasharray={circumference} 
                                    strokeDashoffset={dashOffset}
                                    className={`transition-all duration-1000 ${isFocus ? 'text-violet-500' : 'text-amber-500'}`}
                                />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                <ThemeIcon className={`w-6 h-6 md:w-8 md:h-8 mb-2 md:mb-4 transition-colors ${isFocus ? 'text-violet-500 dark:text-violet-400' : 'text-amber-500 dark:text-amber-400'}`} />
                                <span className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter">
                                    {formatTime(timeLeft)}
                                </span>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">
                                    {isActive ? (isFocus ? 'Flow State' : 'Recharging') : 'Paused'}
                                </p>
                            </div>
                        </div>

                        {/* Primary Controls */}
                        <div className="flex items-center justify-center gap-6 md:gap-8 relative z-10">
                            <button 
                                onClick={resetTimer}
                                className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-white hover:bg-rose-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                                title="Reset"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            
                            <button 
                                onClick={toggleTimer}
                                className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 ${
                                    isFocus 
                                    ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/30' 
                                    : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
                                }`}
                            >
                                {isActive ? <Pause className="w-6 h-6 md:w-8 md:h-8 text-white fill-current" /> : <Play className="w-6 h-6 md:w-8 md:h-8 text-white fill-current ml-1" />}
                            </button>

                            <div className="w-12" /> {/* Spacer to center Play button visually relative to Reset */}
                        </div>
                    </div>

                    {/* NEURAL AUDIO DECK */}
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Neural Audio Deck</span>
                            </div>
                            
                            {/* Visual Volume Indicator */}
                            <div className="flex items-center gap-1">
                                {[1,2,3,4,5].map(bar => (
                                    <div 
                                        key={bar} 
                                        className={`w-1 rounded-full transition-all duration-300 ${
                                            (volume * 10) >= bar 
                                            ? isFocus ? 'h-3 bg-violet-500' : 'h-3 bg-amber-500'
                                            : 'h-1.5 bg-slate-300 dark:bg-slate-700'
                                        }`} 
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button 
                                onClick={() => setSoundMode(soundMode === 'binaural' ? 'off' : 'binaural')}
                                className={`group p-3 rounded-2xl flex items-center gap-3 transition-all border relative overflow-hidden ${
                                    soundMode === 'binaural' 
                                    ? 'bg-violet-50 dark:bg-slate-800 border-violet-500/50' 
                                    : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl transition-colors ${soundMode === 'binaural' ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:text-violet-500'}`}>
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div className="text-left relative z-10 min-w-0">
                                    <p className={`text-sm font-bold truncate transition-colors ${soundMode === 'binaural' ? 'text-violet-700 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>40Hz Gamma</p>
                                    <p className="text-[10px] text-slate-500 truncate">Deep Focus</p>
                                </div>
                                {soundMode === 'binaural' && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(167,139,250,0.8)]" />}
                            </button>

                            <button 
                                onClick={() => setSoundMode(soundMode === 'noise' ? 'off' : 'noise')}
                                className={`group p-3 rounded-2xl flex items-center gap-3 transition-all border relative overflow-hidden ${
                                    soundMode === 'noise' 
                                    ? 'bg-amber-50 dark:bg-slate-800 border-amber-500/50' 
                                    : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl transition-colors ${soundMode === 'noise' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:text-amber-500'}`}>
                                    <Wind className="w-5 h-5" />
                                </div>
                                <div className="text-left relative z-10 min-w-0">
                                    <p className={`text-sm font-bold truncate transition-colors ${soundMode === 'noise' ? 'text-amber-700 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Pink Noise</p>
                                    <p className="text-[10px] text-slate-500 truncate">Block Distraction</p>
                                </div>
                                {soundMode === 'noise' && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]" />}
                            </button>
                        </div>
                        
                        {/* Volume Slider */}
                        {soundMode !== 'off' && (
                            <div className="animate-fade-in px-1">
                                <input 
                                    type="range" min="0" max="0.5" step="0.01" 
                                    value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isFocus ? 'bg-slate-200 dark:bg-slate-700 accent-violet-500' : 'bg-slate-200 dark:bg-slate-700 accent-amber-500'}`}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
