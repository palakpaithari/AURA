import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { 
    Flame, Users, Send, AlertTriangle, Hash, Loader2, Menu, X, Reply, 
    CornerDownRight, ChevronLeft, Brain, TrendingUp, Lightbulb, ShieldAlert,
    ArrowLeft
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db, sendNotification } from '../services/firebase';
import { moderateMessage, generateWisdomInsights } from '../services/gemini';

const TOPICS = [
    { id: 'exam-stress', label: 'Exam Stress', icon: '📚', desc: 'Study tips & panic reduction' },
    { id: 'career-anxiety', label: 'Career Anxiety', icon: '💼', desc: 'Internships & future fears' },
    { id: 'loneliness', label: 'Feeling Lonely', icon: '🌑', desc: 'Finding connection' },
    { id: 'wins', label: 'Small Wins', icon: '🎉', desc: 'Celebrations & progress' }
];

// Extend ChatMessage locally to support replies
interface ExtendedChatMessage extends ChatMessage {
    replyToId?: string;
    replyToName?: string;
    replyToSnippet?: string;
}

export const Campfire = ({ user }: { user: UserProfile }) => {
  const [activeTopic, setActiveTopic] = useState(TOPICS[0]);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Mobile Navigation State
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string, content: string} | null>(null);

  // Mentor Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<{themes: string[], sentiment: number, recommendation: string} | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // When active topic changes, ensure we might want to switch to chat view on mobile
  const handleTopicSelect = (topic: typeof TOPICS[0]) => {
      setActiveTopic(topic);
      setMobileView('chat'); // Automatically go to chat on mobile
      setAnalysisData(null);
      setShowAnalysis(false);
  };

  useEffect(() => {
    const q = query(
        collection(db, `campfires/${activeTopic.id}/messages`),
        orderBy('timestamp', 'asc'),
        limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExtendedChatMessage[];
        
        // NOTIFICATION LOGIC: Check if new message added and it's not mine
        if (newMsgs.length > messages.length && messages.length > 0) {
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg.userId !== user.uid) {
                // If I am tagged in a reply, specific notification
                if (lastMsg.replyToId && lastMsg.replyToName?.includes(user.displayName.slice(0, 3))) { 
                     sendNotification(user.uid, "New Reply", `Someone replied to you in ${activeTopic.label}`, "message");
                }
            }
        }

        setMessages(newMsgs);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [activeTopic.id, user.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim()) return;
      setIsSending(true);

      const moderation = await moderateMessage(newMessage);

      if (moderation.flagged) {
          alert("Your message was flagged by Aura AI as potentially harmful. Please revise.");
          setIsSending(false);
          return;
      }

      const payload: any = {
          userId: user.uid,
          userName: `Owl-${user.uid.slice(0,4)}`, // Anonymous ID
          content: newMessage,
          timestamp: serverTimestamp(),
          isModerated: true
      };

      if (replyingTo) {
          payload.replyToId = replyingTo.id;
          payload.replyToName = replyingTo.name;
          payload.replyToSnippet = replyingTo.content.substring(0, 50) + (replyingTo.content.length > 50 ? '...' : '');
      }

      await addDoc(collection(db, `campfires/${activeTopic.id}/messages`), payload);
      
      setNewMessage('');
      setReplyingTo(null);
      setIsSending(false);
  };

  const handleAnalyzeChat = async () => {
      if (messages.length < 5) {
          alert("Not enough messages to analyze.");
          return;
      }
      setIsAnalyzing(true);
      setShowAnalysis(true);
      
      const recentChats = messages.slice(-30).map(m => m.content);
      const insights = await generateWisdomInsights(recentChats);
      
      setAnalysisData(insights);
      setIsAnalyzing(false);
  };

  const TopicList = () => (
      <div className="space-y-3">
            {TOPICS.map(topic => (
                <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 group border relative overflow-hidden ${
                        activeTopic.id === topic.id 
                        ? 'bg-gradient-to-r from-orange-500/20 to-orange-500/5 border-orange-500/50 text-white shadow-lg shadow-orange-500/10' 
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                >
                    <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${activeTopic.id === topic.id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        <span className="text-xl">{topic.icon}</span>
                    </div>
                    <div className="flex-1">
                        <span className={`font-bold text-base block ${activeTopic.id === topic.id ? 'text-orange-400' : 'text-slate-200'}`}>{topic.label}</span>
                        <span className="text-xs text-slate-500 line-clamp-1">{topic.desc}</span>
                    </div>
                    {/* Arrow for mobile affordance */}
                    <div className="lg:hidden text-slate-600">
                        <ChevronLeft className="w-5 h-5 rotate-180" />
                    </div>
                </button>
            ))}
      </div>
  );

  return (
    // Full height minus padding used in Layout
    <div className="h-[calc(100vh-8rem)] w-full relative">
       
       <div className="flex h-full gap-6">
           
           {/* --- LEFT COLUMN: TOPIC LIST --- */}
           {/* 
              Desktop: Always visible (w-80)
              Mobile: Visible ONLY if mobileView === 'list'
           */}
           <div className={`
               flex-col h-full bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-4 overflow-hidden shadow-lg transition-all
               lg:flex lg:w-80 lg:flex-shrink-0
               ${mobileView === 'list' ? 'flex w-full absolute inset-0 z-20' : 'hidden'}
           `}>
               <div className="mb-6 px-2 pt-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 font-display">
                        <Flame className="w-6 h-6 text-orange-500 fill-orange-500/20" /> Campfire
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 pl-8">Join a circle to start chatting.</p>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                   <TopicList />
               </div>

               <div className="mt-4 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 text-orange-400 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Safety Rules</span>
                    </div>
                    <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside opacity-80">
                        <li>Be kind & supportive</li>
                        <li>Anonymity ≠ Impunity</li>
                        <li>AI moderates all chats</li>
                    </ul>
                </div>
           </div>

           {/* --- RIGHT COLUMN: CHAT AREA --- */}
           {/*
               Desktop: Always visible (flex-1)
               Mobile: Visible ONLY if mobileView === 'chat'
           */}
           <div className={`
                flex-col h-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden relative shadow-2xl transition-all
                lg:flex lg:flex-1
                ${mobileView === 'chat' ? 'flex w-full absolute inset-0 z-30 bg-slate-900' : 'hidden'}
           `}>
               
               {/* CHAT HEADER */}
               <div className="p-4 border-b border-slate-700/50 bg-slate-900/90 flex justify-between items-center z-10 shadow-sm relative">
                   <div className="flex items-center gap-3">
                       {/* Mobile BACK Button */}
                       <button 
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                       >
                           <ArrowLeft className="w-6 h-6" />
                       </button>
                       
                       <div>
                           <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                               <span className="hidden md:inline text-2xl">{activeTopic.icon}</span> 
                               {activeTopic.label}
                           </h3>
                           <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Circle
                           </p>
                       </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                       {/* PEER MENTOR AI TOOLS */}
                       {user.role === 'peer_mentor' && (
                           <button 
                             onClick={handleAnalyzeChat}
                             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                 showAnalysis 
                                 ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20' 
                                 : 'bg-slate-800 border-slate-700 text-violet-300 hover:bg-slate-700'
                             }`}
                           >
                               {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                               <span className="hidden md:inline">Pulse Check</span>
                           </button>
                       )}

                       <div className="hidden md:flex items-center -space-x-2">
                           {[1,2,3].map(i => (
                               <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-500">
                                   <Users className="w-3 h-3" />
                               </div>
                           ))}
                           <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400">
                               +12
                           </div>
                       </div>
                   </div>

                   {/* MENTOR ANALYSIS OVERLAY */}
                   {showAnalysis && (
                       <div className="absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 p-6 z-20 animate-slide-down shadow-2xl">
                           <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center gap-2 text-violet-400">
                                   <Brain className="w-5 h-5" />
                                   <h4 className="font-bold text-sm uppercase tracking-wider">AI Context Analysis</h4>
                               </div>
                               <button onClick={() => setShowAnalysis(false)} className="p-1 hover:bg-slate-800 rounded-full text-slate-500">
                                   <X className="w-4 h-4" />
                               </button>
                           </div>

                           {isAnalyzing || !analysisData ? (
                               <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-3">
                                   <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                                   <p className="text-xs">Analyzing conversation patterns...</p>
                               </div>
                           ) : (
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                       <p className="text-xs text-slate-400 uppercase font-bold mb-2">Group Sentiment</p>
                                       <div className="flex items-end gap-2">
                                           <span className={`text-3xl font-bold ${
                                               analysisData.sentiment < 0.4 ? 'text-rose-400' : 
                                               analysisData.sentiment > 0.7 ? 'text-emerald-400' : 'text-amber-400'
                                           }`}>
                                               {(analysisData.sentiment * 100).toFixed(0)}%
                                           </span>
                                           <span className="text-xs text-slate-500 mb-1">Positivity</span>
                                       </div>
                                       <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                           <div 
                                                className={`h-full transition-all duration-1000 ${
                                                    analysisData.sentiment < 0.4 ? 'bg-rose-500' : 
                                                    analysisData.sentiment > 0.7 ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`} 
                                                style={{ width: `${analysisData.sentiment * 100}%` }}
                                           />
                                       </div>
                                   </div>

                                   <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                       <p className="text-xs text-slate-400 uppercase font-bold mb-2 flex items-center gap-2">
                                           <TrendingUp className="w-3 h-3" /> Emerging Themes
                                       </p>
                                       <div className="flex flex-wrap gap-2">
                                           {analysisData.themes.map((theme, i) => (
                                               <span key={i} className="text-xs bg-slate-700/50 text-slate-200 px-2 py-1 rounded-md border border-slate-600">
                                                   #{theme}
                                               </span>
                                           ))}
                                       </div>
                                   </div>

                                   <div className="bg-gradient-to-br from-violet-600/20 to-slate-800/50 p-4 rounded-xl border border-violet-500/30">
                                       <p className="text-xs text-violet-300 uppercase font-bold mb-2 flex items-center gap-2">
                                           <Lightbulb className="w-3 h-3" /> Intervention Strategy
                                       </p>
                                       <p className="text-xs text-slate-200 leading-relaxed italic">
                                           "{analysisData.recommendation}"
                                       </p>
                                   </div>
                               </div>
                           )}
                       </div>
                   )}
               </div>

               {/* MESSAGES AREA */}
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-slate-900/50">
                   <div className="py-8 flex flex-col items-center justify-center opacity-50">
                       <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mb-3 shadow-inner">
                           <Hash className="w-8 h-8 text-slate-600" />
                       </div>
                       <p className="text-slate-500 text-sm">Beginning of "{activeTopic.label}"</p>
                   </div>
                   
                   {messages.map((msg, idx) => {
                       const isMe = msg.userId === user.uid;
                       const showAvatar = idx === 0 || messages[idx-1].userId !== msg.userId;

                       return (
                           <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                               
                               <div className={`max-w-[85%] md:max-w-[70%] relative group flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                   
                                   {/* Avatar Placeholder */}
                                   <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-lg mt-auto mb-1 ${
                                       isMe 
                                       ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white' 
                                       : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300'
                                   } ${!showAvatar ? 'opacity-0' : ''}`}>
                                       {isMe ? 'ME' : msg.userName.slice(-2)}
                                   </div>

                                   <div className="flex flex-col gap-1 min-w-0">
                                       {/* Reply Context */}
                                       {msg.replyToId && (
                                           <div className={`text-[10px] flex items-center gap-1 opacity-70 mb-0.5 px-2 ${isMe ? 'justify-end text-orange-200' : 'text-slate-400'}`}>
                                               <CornerDownRight className="w-3 h-3" />
                                               <span className="truncate max-w-[150px]">Replying to <strong>{msg.replyToName}</strong></span>
                                           </div>
                                       )}

                                       {/* Message Bubble */}
                                       <div className={`p-3.5 rounded-2xl relative shadow-md text-sm leading-relaxed ${
                                           isMe 
                                           ? 'bg-orange-600 text-white rounded-tr-sm' 
                                           : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                                       }`}>
                                           <p>{msg.content}</p>
                                           
                                           {/* Timestamp */}
                                           <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-orange-200/60' : 'text-slate-500'}`}>
                                               {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                           </p>

                                           {/* Hover Actions (Reply Button) */}
                                           <button 
                                                onClick={() => setReplyingTo({ id: msg.id, name: msg.userName, content: msg.content })}
                                                className={`absolute -top-2 ${isMe ? '-left-8' : '-right-8'} p-1.5 rounded-full bg-slate-700 text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-600 shadow-lg scale-90 hover:scale-100`}
                                                title="Reply"
                                           >
                                               <Reply className="w-3 h-3" />
                                           </button>
                                       </div>
                                       
                                       {/* User Label (Only for others) */}
                                       {!isMe && showAvatar && (
                                           <p className="text-[10px] text-slate-500 ml-1">{msg.userName}</p>
                                       )}
                                   </div>
                               </div>
                           </div>
                       );
                   })}
                   <div ref={bottomRef} />
               </div>

               {/* INPUT AREA */}
               <div className="p-4 bg-slate-900 border-t border-slate-800 z-20">
                   {/* Replying Banner */}
                   {replyingTo && (
                       <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur-sm p-3 rounded-xl border border-slate-700 mb-3 animate-slide-up">
                           <div className="flex items-center gap-3 overflow-hidden">
                               <div className="w-1 h-8 bg-orange-500 rounded-full"></div>
                               <div className="min-w-0">
                                    <p className="text-xs text-orange-400 font-bold flex items-center gap-1">
                                        <Reply className="w-3 h-3" /> Replying to {replyingTo.name}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-md opacity-80">"{replyingTo.content}"</p>
                               </div>
                           </div>
                           <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                               <X className="w-4 h-4" />
                           </button>
                       </div>
                   )}

                   <form onSubmit={handleSendMessage} className="relative">
                       <input 
                           className="w-full bg-slate-800 text-white rounded-2xl pl-4 pr-14 py-4 outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-slate-500 border border-slate-700/50 transition-all shadow-inner"
                           placeholder={`Message #${activeTopic.id}...`}
                           value={newMessage}
                           onChange={e => setNewMessage(e.target.value)}
                           autoFocus={false}
                       />
                       <button 
                           type="submit" 
                           disabled={isSending || !newMessage.trim()}
                           className="absolute right-2 top-2 bottom-2 aspect-square bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:bg-slate-700 flex items-center justify-center shadow-lg hover:shadow-orange-500/20"
                       >
                           {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                       </button>
                   </form>
               </div>
           </div>
       </div>
    </div>
  );
};