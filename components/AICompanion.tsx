
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, AIChatSession, AIChatMessage } from '../types';
import { 
    Send, Bot, History, Plus, MoreVertical, Edit3, Trash2, 
    MessageSquare, ChevronLeft, Loader2, Sparkles, X, Languages, User
} from 'lucide-react';
import { 
    collection, query, where, orderBy, onSnapshot, 
    addDoc, serverTimestamp, updateDoc, doc, deleteDoc, writeBatch, getDocs
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { generateChatResponse, generateChatTitle } from '../services/gemini';

export const AICompanion = ({ user }: { user: UserProfile }) => {
    // --- STATE ---
    const [chats, setChats] = useState<AIChatSession[]>([]);
    const [messages, setMessages] = useState<AIChatMessage[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // UI State
    const [showHistory, setShowHistory] = useState(false); // Desktop Slide-over
    const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false); // Mobile Bottom Sheet
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- EFFECTS ---

    // 1. Load Chat Sessions (Client-side Sort to avoid Index Error)
    useEffect(() => {
        const q = query(
            collection(db, 'aiChats'),
            where('userId', '==', user.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AIChatSession[];
            // Sort Descending by UpdatedAt
            fetchedChats.sort((a, b) => {
                const tA = a.updatedAt?.seconds || 0;
                const tB = b.updatedAt?.seconds || 0;
                return tB - tA;
            });
            setChats(fetchedChats);
        });
        return () => unsubscribe();
    }, [user.uid]);

    // 2. Load Messages for Active Chat (Client-side Sort to avoid Index Error)
    useEffect(() => {
        if (!currentChatId) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, 'aiMessages'),
            where('chatId', '==', currentChatId)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AIChatMessage[];
            // Sort Ascending by CreatedAt
            fetchedMsgs.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tA - tB;
            });
            setMessages(fetchedMsgs);
        });
        return () => unsubscribe();
    }, [currentChatId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // --- ACTIONS ---

    const handleCreateNewChat = () => {
        setCurrentChatId(null);
        setMessages([]);
        setMobileHistoryOpen(false);
        if (window.innerWidth >= 1024) setShowHistory(false); // Close history on desktop on new chat
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsgContent = input;
        setInput('');
        setIsTyping(true);

        let activeId = currentChatId;

        try {
            // 1. If no chat active, create one
            if (!activeId) {
                // Determine title
                const autoTitle = await generateChatTitle(userMsgContent);
                
                const chatRef = await addDoc(collection(db, 'aiChats'), {
                    userId: user.uid,
                    title: autoTitle,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    language: 'auto'
                });
                activeId = chatRef.id;
                setCurrentChatId(activeId);
            }

            // 2. Save User Message
            await addDoc(collection(db, 'aiMessages'), {
                chatId: activeId,
                sender: 'user',
                content: userMsgContent,
                createdAt: serverTimestamp()
            });

            // 3. Update Chat Timestamp
            await updateDoc(doc(db, 'aiChats', activeId), {
                updatedAt: serverTimestamp()
            });

            // 4. Generate AI Response
            // Prepare context (Last 15 messages for context window efficiency)
            const historyContext = messages.slice(-15).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
                parts: [{ text: m.content }]
            }));

            const aiResponseText = await generateChatResponse(historyContext, userMsgContent);

            // 5. Save AI Message
            await addDoc(collection(db, 'aiMessages'), {
                chatId: activeId,
                sender: 'ai',
                content: aiResponseText,
                createdAt: serverTimestamp()
            });

        } catch (error) {
            console.error(error);
            alert("Failed to send message. Please check your connection.");
        } finally {
            setIsTyping(false);
        }
    };

    const handleDeleteChat = async (chatId: string) => {
        if (!window.confirm("Delete this conversation?")) return;
        try {
            // 1. Delete Messages first
            const msgsQuery = query(collection(db, 'aiMessages'), where('chatId', '==', chatId));
            const msgsSnap = await getDocs(msgsQuery);
            
            const batch = writeBatch(db);
            msgsSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 2. Delete the chat document
            batch.delete(doc(db, 'aiChats', chatId));
            
            await batch.commit();

            if (currentChatId === chatId) handleCreateNewChat();
        } catch (e) {
            console.error("Delete failed", e);
            alert("Failed to delete chat completely. Please try again.");
        }
    };

    const handleRenameChat = async (chatId: string) => {
        if (!editTitle.trim()) return;
        try {
            await updateDoc(doc(db, 'aiChats', chatId), { title: editTitle });
            setEditingChatId(null);
        } catch (e) {
            console.error(e);
        }
    };

    // --- RENDER HELPERS ---

    const ChatHistoryList = () => (
        <div className="flex flex-col gap-2 p-4 h-full overflow-y-auto custom-scrollbar">
            <button 
                onClick={handleCreateNewChat}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg hover:shadow-violet-500/25 mb-4 group font-medium"
            >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                <span>New Conversation</span>
            </button>
            
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2 mt-2">Recent History</p>
            
            {chats.length === 0 && (
                <div className="text-center py-10 opacity-50 flex flex-col items-center">
                    <History className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500">No previous chats</p>
                </div>
            )}

            {chats.map(chat => (
                <div 
                    key={chat.id} 
                    className={`group relative flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${
                        currentChatId === chat.id 
                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm' 
                        : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    onClick={() => {
                        setCurrentChatId(chat.id);
                        if (window.innerWidth < 1024) setMobileHistoryOpen(false);
                    }}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentChatId === chat.id ? 'text-violet-500' : ''}`} />
                        
                        {editingChatId === chat.id ? (
                            <input 
                                autoFocus
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                    if(e.key === 'Enter') handleRenameChat(chat.id);
                                    if(e.key === 'Escape') setEditingChatId(null);
                                }}
                                onBlur={() => setEditingChatId(null)}
                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-1 rounded w-full outline-none border border-violet-500 text-sm shadow-sm"
                            />
                        ) : (
                            <span className="truncate text-sm font-medium">{chat.title}</span>
                        )}
                    </div>

                    {/* Chat Menu - Adjusted visibility for mobile/active states */}
                    <div className={`flex items-center gap-1 transition-opacity ${
                        currentChatId === chat.id ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                    }`}>
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingChatId(chat.id);
                                setEditTitle(chat.title);
                            }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-violet-500"
                        >
                             <Edit3 className="w-3 h-3" />
                         </button>
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                            }}
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded text-slate-400 hover:text-rose-500"
                        >
                             <Trash2 className="w-3 h-3" />
                         </button>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="h-[calc(100vh-8.5rem)] w-full flex relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-50 dark:bg-[#0b1120]">
            
            {/* --- MAIN CHAT AREA --- */}
            <div className="flex-1 flex flex-col relative z-10 h-full">
                
                {/* HEADER */}
                <div className="flex-none p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-[#0b1120]/90 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#0b1120] rounded-full"></div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Aura AI 
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                    <Languages className="w-3 h-3" /> Hinglish
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Online • Context-Aware • Private</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Mobile History Toggle */}
                        <button 
                            onClick={() => setMobileHistoryOpen(true)}
                            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                        >
                            <History className="w-6 h-6" />
                        </button>
                        
                        {/* Desktop History Toggle */}
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 bg-white dark:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-800"
                        >
                            <History className="w-4 h-4" />
                            {showHistory ? 'Hide History' : 'History'}
                        </button>
                        
                        <button onClick={handleCreateNewChat} className="hidden lg:flex p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 shadow-lg shadow-violet-500/20 active:scale-95 transition-all">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* MESSAGES LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 relative bg-gradient-to-b from-transparent to-slate-100/50 dark:to-slate-900/30">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
                            <div className="w-24 h-24 bg-gradient-to-tr from-violet-500/10 to-fuchsia-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-violet-500/20">
                                <Sparkles className="w-10 h-10 text-violet-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bolo, kya scene hai?</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 px-4 leading-relaxed">
                                I'm Aura. I speak English, Hindi, and Hinglish fluently.
                                <br />Chat with me about exams, stress, or just to vent.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg px-2">
                                {[
                                    "Yaar, padhai ka mann nahi kar raha.",
                                    "Interview ki tension ho rahi hai.",
                                    "How to manage sleep cycle?",
                                    "Bas aise hi baat karni thi."
                                ].map((prompt, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => { setInput(prompt); }}
                                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-violet-500 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all text-left shadow-sm hover:shadow-md"
                                    >
                                        "{prompt}"
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isUser = msg.sender === 'user';
                            return (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                                >
                                    {!isUser && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md mr-2 mt-auto mb-1">
                                            <Bot size={14} />
                                        </div>
                                    )}
                                    
                                    <div className={`max-w-[85%] md:max-w-[70%] relative group ${isUser ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-4 shadow-sm text-sm md:text-base leading-relaxed ${
                                            isUser 
                                            ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm shadow-violet-500/10' 
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm'
                                        }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        <p className={`text-[10px] mt-1 opacity-60 font-medium ${isUser ? 'text-right text-slate-500' : 'text-left text-slate-500'}`}>
                                            {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sending...'}
                                        </p>
                                    </div>

                                    {isUser && (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 ml-2 mt-auto mb-1">
                                            <User size={14} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    
                    {isTyping && (
                        <div className="flex justify-start animate-fade-in">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md mr-2 mt-auto mb-1">
                                <Bot size={14} />
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="pb-2" />
                </div>

                {/* INPUT AREA */}
                <div className="flex-none p-4 bg-white dark:bg-[#0b1120] border-t border-slate-200 dark:border-slate-800 z-20">
                    <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto flex items-end gap-2">
                        <div className="flex-1 relative">
                            <input 
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Type in Hinglish, Hindi, or English..."
                                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-5 pr-12 py-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all shadow-inner placeholder:text-slate-400"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="h-[56px] w-[56px] bg-violet-600 hover:bg-violet-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shadow-lg hover:shadow-violet-500/30 active:scale-95"
                        >
                            {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-slate-400 mt-2 font-medium opacity-70">
                        Aura AI helps you navigate student life. Advice is supportive, not clinical.
                    </p>
                </div>
            </div>

            {/* --- DESKTOP SLIDE-OVER HISTORY --- */}
            <div className={`
                hidden lg:flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] transition-all duration-500 ease-in-out z-10
                ${showHistory ? 'w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10 overflow-hidden'}
            `}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Chat History</h3>
                    <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400">
                        <X size={16} />
                    </button>
                </div>
                <ChatHistoryList />
            </div>

            {/* --- MOBILE HISTORY DRAWER --- */}
            {mobileHistoryOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileHistoryOpen(false)} />
                    <div className="bg-white dark:bg-[#0f172a] w-full sm:w-96 h-[85vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl relative z-10 flex flex-col shadow-2xl animate-slide-up border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Your Conversations</h3>
                            <button onClick={() => setMobileHistoryOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/20 text-slate-500 hover:text-rose-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <ChatHistoryList />
                    </div>
                </div>
            )}

        </div>
    );
};
