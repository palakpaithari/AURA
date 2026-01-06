import React, { useState, useEffect } from 'react';
    import { BookHeart, Send, Mic, Sparkles, Loader2, Lock, MicOff } from 'lucide-react';
    import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
    import { db } from '../services/firebase';
    import { UserProfile, JournalEntry } from '../types';
    import { analyzeJournalEntry } from '../services/gemini';
    
    export const Journal = ({ user }: { user: UserProfile }) => {
      const [entries, setEntries] = useState<JournalEntry[]>([]);
      const [newEntry, setNewEntry] = useState('');
      const [isAnalyzing, setIsAnalyzing] = useState(false);
      const [isRecording, setIsRecording] = useState(false);
    
      useEffect(() => {
        // Query without sorting to avoid index errors
        const q = query(
          collection(db, 'journals'),
          where('userId', '==', user.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JournalEntry[];
          
          // Client-side Sort (Newest First)
          fetchedEntries.sort((a, b) => {
             const timeA = a.timestamp?.seconds || 0;
             const timeB = b.timestamp?.seconds || 0;
             return timeB - timeA;
          });
          
          setEntries(fetchedEntries);
        });
        return () => unsubscribe();
      }, [user.uid]);
    
      const handlePost = async () => {
        if (!newEntry.trim()) return;
        setIsAnalyzing(true);
    
        try {
          // 1. Google Tech: Gemini API for Sentiment & Empathy
          const analysis = await analyzeJournalEntry(newEntry);
    
          // 2. Google Tech: Firestore for persistence
          await addDoc(collection(db, 'journals'), {
            userId: user.uid,
            content: newEntry,
            sentiment: analysis.sentiment,
            aiResponse: analysis.response,
            tags: [],
            timestamp: serverTimestamp(),
            isPrivate: true
          });
          setNewEntry('');
        } catch (e) {
          console.error(e);
        } finally {
          setIsAnalyzing(false);
        }
      };

      const handleVoiceInput = () => {
        if (isRecording) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert("Your browser does not support voice input. Please try Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsRecording(true);
        recognition.start();

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setNewEntry(prev => (prev ? prev + " " + transcript : transcript));
            setIsRecording(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };
      };
    
      return (
        <div className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in">
          {/* Editor Section */}
          <div className="flex-1 flex flex-col h-full">
            <div className="mb-6">
               <h2 className="text-3xl font-bold text-white font-display mb-2">Reflect</h2>
               <p className="text-slate-400">Unload your mind. Aura AI is listening without judgment.</p>
            </div>
    
            <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-3xl p-4 flex flex-col relative overflow-hidden focus-within:border-violet-500/50 transition-colors">
                <textarea 
                    className="flex-1 bg-transparent border-none outline-none text-lg text-slate-200 resize-none p-4 placeholder-slate-600 custom-scrollbar"
                    placeholder="What's weighing on you today?"
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                />
                
                <div className="flex justify-between items-center p-2 border-t border-slate-800">
                    <button 
                        onClick={handleVoiceInput}
                        className={`p-3 rounded-full transition-all flex items-center gap-2 ${
                            isRecording 
                            ? 'bg-rose-500/20 text-rose-400 animate-pulse' 
                            : 'hover:bg-slate-800 text-slate-400'
                        }`}
                        title={isRecording ? "Listening..." : "Use Voice Input"}
                    >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        {isRecording && <span className="text-xs font-bold">Listening...</span>}
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Lock className="w-3 h-3" /> Private & Encrypted
                        </div>
                        <button 
                            onClick={handlePost}
                            disabled={isAnalyzing || !newEntry.trim()}
                            className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isAnalyzing ? 'Processing...' : 'Save Entry'}
                        </button>
                    </div>
                </div>
            </div>
          </div>
    
          {/* History Section */}
          <div className="w-full lg:w-96 space-y-4 overflow-y-auto pb-20 custom-scrollbar">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Past Reflections</h3>
              {entries.length === 0 && (
                  <p className="text-slate-600 text-sm italic">No journal entries yet.</p>
              )}
              {entries.map(entry => (
                  <div key={entry.id} className="glass-panel p-5 rounded-2xl border-l-4 border-l-violet-500 hover:bg-slate-800/80 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-slate-500 font-mono">
                              {entry.timestamp?.seconds ? new Date(entry.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                          </span>
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                              entry.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                              entry.sentiment === 'negative' ? 'bg-rose-500/20 text-rose-400' :
                              'bg-slate-700 text-slate-400'
                          }`}>
                              {entry.sentiment}
                          </span>
                      </div>
                      <p className="text-slate-300 text-sm line-clamp-3 mb-3 font-light">"{entry.content}"</p>
                      
                      {entry.aiResponse && (
                          <div className="bg-violet-500/10 p-3 rounded-xl flex gap-3">
                              <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-1" />
                              <p className="text-xs text-violet-200 italic">{entry.aiResponse}</p>
                          </div>
                      )}
                  </div>
              ))}
          </div>
        </div>
      );
    };