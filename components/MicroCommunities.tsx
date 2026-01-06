import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, Community, CommunityMessage, CommunityMember } from '../types';
import { 
    Users, Plus, Search, MessageSquare, ArrowLeft, Send, 
    MoreVertical, Shield, Hash, Loader2, Sparkles, X,
    Lock, Circle, ArrowUpDown, Inbox, Clock, Check, Bell,
    Reply, CornerDownRight, Filter
} from 'lucide-react';
import { 
    collection, query, where, orderBy, onSnapshot, addDoc, 
    serverTimestamp, limit, getDocs, doc, getDoc, setDoc, updateDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { moderateMessage } from '../services/gemini';

// --- ANONYMITY GENERATOR ---
const ADJECTIVES = ['Neon', 'Cyber', 'Silent', 'Hidden', 'Misty', 'Velvet', 'Solar', 'Lunar', 'Cosmic', 'Swift'];
const ANIMALS = ['Fox', 'Owl', 'Wolf', 'Raven', 'Tiger', 'Bear', 'Falcon', 'Lynx', 'Phoenix', 'Dragon'];

const generateAlias = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 9999);
    return `${adj} ${animal} ${num}`;
};

// --- DYNAMIC THEME GENERATOR ---
const generateGroupTheme = (groupName: string) => {
    const name = groupName.toLowerCase();
    let icons: string[] = [];
    let bgGradient = '';
    let accentColor = '';

    // Theme Matching Logic
    if (name.includes('code') || name.includes('dev') || name.includes('hack') || name.includes('tech') || name.includes('java') || name.includes('python')) {
        icons = ['💻', '⚡', '{ }', 'GFG', 'LC', '☕', 'Bug', 'Git'];
        bgGradient = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
        accentColor = '#0ea5e9'; // Sky blue
    } else if (name.includes('dance') || name.includes('music') || name.includes('vibes') || name.includes('hop')) {
        icons = ['💃', '🎵', '🕺', '🎶', '🩰', '🎹', '✨', '👟'];
        bgGradient = 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)';
        accentColor = '#f472b6'; // Pink
    } else if (name.includes('art') || name.includes('design') || name.includes('creative') || name.includes('draw')) {
        icons = ['🎨', '✏️', '🖌️', '🎭', '🌈', '🖼️', '🖊️'];
        bgGradient = 'linear-gradient(135deg, #3f2c22 0%, #7c2d12 100%)';
        accentColor = '#fb923c'; // Orange
    } else if (name.includes('game') || name.includes('play') || name.includes('sport') || name.includes('ball')) {
        icons = ['🎮', '⚽', '🕹️', '🏆', '👾', '🏀', '🎲'];
        bgGradient = 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)';
        accentColor = '#34d399'; // Emerald
    } else if (name.includes('read') || name.includes('book') || name.includes('study') || name.includes('learn')) {
        icons = ['📚', '📖', '💡', '🎓', '📝', '🧠', '🧐'];
        bgGradient = 'linear-gradient(135deg, #3730a3 0%, #312e81 100%)';
        accentColor = '#818cf8'; // Indigo
    } else {
        // Default Abstract
        icons = ['✨', '💬', '🌟', '🚀', '👋', '❤️', '🔥'];
        bgGradient = 'linear-gradient(135deg, #111827 0%, #1f2937 100%)';
        accentColor = '#94a3b8'; // Slate
    }

    // Generate SVG Pattern
    const svgPattern = `
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <style>text { font-family: sans-serif; opacity: 0.07; font-weight: bold; fill: white; }</style>
            ${icons.map((icon, i) => {
                const x = Math.random() * 200;
                const y = Math.random() * 200;
                const size = 12 + Math.random() * 20;
                const rotate = Math.random() * 360;
                return `<text x="${x}" y="${y}" font-size="${size}" transform="rotate(${rotate}, ${x}, ${y})">${icon}</text>`;
            }).join('')}
            <text x="100" y="100" font-size="20" text-anchor="middle" dominant-baseline="middle" opacity="0.03" transform="rotate(-45, 100, 100)">${groupName.toUpperCase()}</text>
        </svg>
    `;

    const encodedSvg = encodeURIComponent(svgPattern);

    return {
        background: `${bgGradient}, url("data:image/svg+xml,${encodedSvg}")`,
        backgroundBlendMode: 'overlay',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover, 300px 300px',
        accentColor
    };
};

export const MicroCommunities = ({ user }: { user: UserProfile }) => {
    // --- STATE ---
    const [groups, setGroups] = useState<Community[]>([]);
    const [activeGroup, setActiveGroup] = useState<Community | null>(null);
    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [currentUserAlias, setCurrentUserAlias] = useState<string | null>(null);
    
    // My Joined Groups (For Messages Tab)
    const [myJoinedIds, setMyJoinedIds] = useState<Set<string>>(new Set());
    const [justJoinedId, setJustJoinedId] = useState<string | null>(null); // For Animation

    // Reply State
    const [replyingTo, setReplyingTo] = useState<{ id: string, alias: string, content: string } | null>(null);

    // Unread State (Local Persist)
    const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});

    // UI State
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [activeTab, setActiveTab] = useState<'ai' | 'user' | 'messages'>('ai');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    // Sorting & Filtering
    const [sortBy, setSortBy] = useState<'recent' | 'newest' | 'oldest' | 'popular' | 'quiet'>('recent');
    const [searchInput, setSearchInput] = useState('');
    
    // Inputs
    const [messageInput, setMessageInput] = useState('');
    const [newGroupData, setNewGroupData] = useState({ name: '', desc: '' });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const seedingRef = useRef(false); // Prevents concurrent seeding

    // Dynamic Theme State
    const [currentTheme, setCurrentTheme] = useState<any>({});

    // --- LOAD READ RECEIPTS ---
    useEffect(() => {
        const stored = localStorage.getItem(`aura_reads_${user.uid}`);
        if (stored) {
            try { setLastReadMap(JSON.parse(stored)); } catch(e) {}
        }
    }, [user.uid]);

    // --- EFFECT: FETCH USER MEMBERSHIPS (MY CHATS) ---
    useEffect(() => {
        const q = query(collection(db, 'communityMembers'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ids = new Set<string>();
            snapshot.docs.forEach((doc) => {
                const data = doc.data() as any;
                if (data.groupId) {
                    ids.add(data.groupId as string);
                }
            });
            setMyJoinedIds(ids);
        });
        return () => unsubscribe();
    }, [user.uid]);

    // --- EFFECT: FETCH GROUPS ---
    useEffect(() => {
        const q = query(
            collection(db, 'microCommunities'), 
            orderBy('lastMessageAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Community[];
            
            // Deduplicate AI groups by name for display (Keep the one with most recent activity)
            // rawGroups is ordered by lastMessageAt desc, so the first occurrence is the "freshest"
            const seenAiNames = new Set<string>();
            const uniqueGroups: Community[] = [];

            rawGroups.forEach(g => {
                if (g.type === 'ai') {
                    if (!seenAiNames.has(g.name)) {
                        seenAiNames.add(g.name);
                        uniqueGroups.push(g);
                    }
                } else {
                    uniqueGroups.push(g);
                }
            });

            setGroups(uniqueGroups);
            setLoading(false);
            
            // Seed AI Groups if we have fewer than the defaults
            // We check uniqueGroups length to ensure we fill gaps even if duplicates exist but are hidden
            const aiGroupCount = uniqueGroups.filter(g => g.type === 'ai').length;
            if (aiGroupCount < 6) {
                seedDefaultGroups();
            }
        });
        return () => unsubscribe();
    }, []);

    const seedDefaultGroups = async () => {
        if (seedingRef.current) return;
        seedingRef.current = true;

        try {
            const defaults = [
                { name: "Anxiety Support", desc: "A quiet place to share worries.", type: 'ai' },
                { name: "Academic Pressure", desc: "For when exams feel overwhelming.", type: 'ai' },
                { name: "Night Owls", desc: "Can't sleep? You're not alone.", type: 'ai' },
                { name: "Imposter Syndrome", desc: "When you feel like you don't belong.", type: 'ai' },
                { name: "Social Battery Low", desc: "Recharging from social exhaustion.", type: 'ai' },
                { name: "Burnout Recovery", desc: "Healing from academic exhaustion.", type: 'ai' }
            ];

            // Check existing to avoid duplicates
            const existingSnap = await getDocs(query(collection(db, 'microCommunities'), where('type', '==', 'ai')));
            const existingNames = new Set(existingSnap.docs.map(d => d.data().name));

            for (const g of defaults) {
                if (!existingNames.has(g.name)) {
                    await addDoc(collection(db, 'microCommunities'), {
                        ...g,
                        createdBy: 'system',
                        memberCount: 0,
                        isActive: true,
                        createdAt: serverTimestamp(),
                        lastMessageAt: serverTimestamp()
                    });
                    existingNames.add(g.name); // Prevent adding duplicate in same loop
                }
            }
        } catch (e) {
            console.error("Seeding error:", e);
        } finally {
            seedingRef.current = false;
        }
    };

    // --- EFFECT: HANDLE GROUP SELECTION & JOINING ---
    useEffect(() => {
        if (!activeGroup) {
            setMessages([]);
            return;
        }

        // Generate Theme
        setCurrentTheme(generateGroupTheme(activeGroup.name));
        setReplyingTo(null);

        // Mark as Read
        const now = Date.now();
        const newMap = { ...lastReadMap, [activeGroup.id]: now };
        setLastReadMap(newMap);
        localStorage.setItem(`aura_reads_${user.uid}`, JSON.stringify(newMap));

        const setupMembership = async () => {
            // Check if user is already a member (has an alias)
            const memberRef = doc(db, 'communityMembers', `${activeGroup.id}_${user.uid}`);
            const memberSnap = await getDoc(memberRef);

            if (memberSnap.exists()) {
                setCurrentUserAlias(memberSnap.data().anonAlias);
            } else {
                // Join Group Logic (Generate Alias)
                const newAlias = generateAlias();
                await setDoc(memberRef, {
                    groupId: activeGroup.id,
                    userId: user.uid,
                    anonAlias: newAlias,
                    joinedAt: serverTimestamp()
                });
                setCurrentUserAlias(newAlias);
                
                // Trigger Join Animation
                setJustJoinedId(activeGroup.id);
                setTimeout(() => setJustJoinedId(null), 2000);
            }
        };

        setupMembership();

        // Subscribe to Messages
        const q = query(
            collection(db, 'communityMessages'),
            where('groupId', '==', activeGroup.id)
        );

        const unsubMessages = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityMessage[];
            
            // Client-side sort by createdAt ascending
            fetchedMessages.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tA - tB;
            });

            setMessages(fetchedMessages);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => unsubMessages();
    }, [activeGroup, user.uid]);

    // --- ACTIONS ---

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary highlight class
            element.classList.add('ring-2', 'ring-teal-500', 'ring-offset-2', 'ring-offset-slate-900', 'bg-white/5');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-teal-500', 'ring-offset-2', 'ring-offset-slate-900', 'bg-white/5');
            }, 1500);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupData.name.trim()) return;
        
        try {
            const docRef = await addDoc(collection(db, 'microCommunities'), {
                name: newGroupData.name,
                description: newGroupData.desc,
                type: 'user',
                createdBy: user.uid,
                memberCount: 1,
                isActive: true,
                createdAt: serverTimestamp(),
                lastMessageAt: serverTimestamp()
            });

            // Auto-join the creator
            const newAlias = generateAlias();
            await setDoc(doc(db, 'communityMembers', `${docRef.id}_${user.uid}`), {
                groupId: docRef.id,
                userId: user.uid,
                anonAlias: newAlias,
                joinedAt: serverTimestamp()
            });

            setShowCreateModal(false);
            setNewGroupData({ name: '', desc: '' });
        } catch (e) {
            console.error("Error creating group:", e);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeGroup || !currentUserAlias) return;
        setSending(true);

        try {
            // 1. Moderate
            const moderation = await moderateMessage(messageInput);
            if (moderation.flagged) {
                alert("Message flagged by AI Safety Filter.");
                setSending(false);
                return;
            }

            // 2. Prepare Payload with Reply Info
            const payload: any = {
                groupId: activeGroup.id,
                content: messageInput,
                senderAlias: currentUserAlias,
                senderId: user.uid, // Hidden field
                createdAt: serverTimestamp(),
                isFlagged: false
            };

            if (replyingTo) {
                payload.replyToId = replyingTo.id;
                payload.replyToAlias = replyingTo.alias;
                payload.replyToContent = replyingTo.content;
            }

            // 3. Send
            await addDoc(collection(db, 'communityMessages'), payload);

            // 4. Bump Group Timestamp (for unread ordering)
            await updateDoc(doc(db, 'microCommunities', activeGroup.id), {
                lastMessageAt: serverTimestamp()
            });

            setMessageInput('');
            setReplyingTo(null);
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    const handleGroupClick = (group: Community) => {
        setActiveGroup(group);
        setMobileView('chat');
    };

    // --- HELPERS ---
    const isUnread = (group: Community) => {
        if (!group.lastMessageAt) return false;
        const lastMsgTime = group.lastMessageAt?.seconds * 1000;
        const userReadTime = lastReadMap[group.id] || 0;
        return lastMsgTime > userReadTime;
    };

    // --- CALCULATE REPLY COUNTS ---
    const replyCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        messages.forEach(m => {
            if (m.replyToId) {
                counts[m.replyToId] = (counts[m.replyToId] || 0) + 1;
            }
        });
        return counts;
    }, [messages]);

    // --- FILTERING & SORTING ---
    const getProcessedGroups = () => {
        let processed = groups;

        // 1. Filter by Tab
        if (activeTab === 'messages') {
            processed = processed.filter(g => myJoinedIds.has(g.id));
        } else {
            processed = processed.filter(g => g.type === activeTab);
        }

        // 2. Filter by Search
        if (searchInput) {
            processed = processed.filter(g => 
                g.name.toLowerCase().includes(searchInput.toLowerCase()) || 
                g.description.toLowerCase().includes(searchInput.toLowerCase())
            );
        }

        // 3. Sort
        // Force 'recent' sort for Messages tab (WhatsApp style)
        const sortMode = activeTab === 'messages' ? 'recent' : sortBy;
        
        processed.sort((a, b) => {
            switch (sortMode) {
                case 'newest':
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case 'oldest':
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case 'popular':
                    return (b.memberCount || 0) - (a.memberCount || 0);
                case 'quiet':
                    return (a.memberCount || 0) - (b.memberCount || 0);
                case 'recent':
                default:
                    // Default to last active
                    return (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0);
            }
        });

        return processed;
    };

    const displayedGroups = getProcessedGroups();

    return (
        <div className="h-[calc(100vh-8rem)] w-full relative flex gap-6">
            
            {/* --- LEFT PANEL: GROUP LIST --- */}
            <div className={`
                flex-col bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-lg transition-all
                lg:flex lg:w-96 lg:flex-shrink-0 relative
                ${mobileView === 'list' ? 'flex w-full absolute inset-0 z-20 bg-slate-900' : 'hidden'}
            `}>
                
                {/* Sticky Header */}
                <div className="p-4 border-b border-slate-700/50 bg-slate-900/95 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-display">
                            <Users className="w-6 h-6 text-teal-400" /> Communities
                        </h2>
                    </div>

                    {/* Search */}
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'messages' ? "Search my chats..." : "Find your tribe..."}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-500 transition-colors"
                        />
                    </div>

                    {/* Sorting Controls (Hidden in Messages tab) */}
                    {activeTab !== 'messages' && (
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700 w-full">
                                <Filter className="w-3 h-3 text-violet-400" />
                                <span className="font-bold whitespace-nowrap">Sort by:</span>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-transparent outline-none text-slate-300 font-medium cursor-pointer w-full"
                                >
                                    <option value="recent">Recently Active</option>
                                    <option value="newest">Newest Created</option>
                                    <option value="oldest">Oldest Created</option>
                                    <option value="popular">Most Members</option>
                                    <option value="quiet">Fewest Members</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex bg-slate-800/50 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('ai')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'ai' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            AI Safe
                        </button>
                        <button 
                            onClick={() => setActiveTab('user')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'user' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Students
                        </button>
                        <button 
                            onClick={() => setActiveTab('messages')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'messages' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Inbox className="w-3 h-3" /> Messages
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 pb-20">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                    ) : displayedGroups.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <Users className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                            <p className="text-sm text-slate-500">
                                {activeTab === 'messages' ? "You haven't joined any groups yet." : "No communities found."}
                            </p>
                        </div>
                    ) : (
                        displayedGroups.map(group => {
                            const unread = isUnread(group);
                            const isJustJoined = justJoinedId === group.id;

                            return (
                                <button
                                    key={group.id}
                                    onClick={() => handleGroupClick(group)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all duration-500 group relative overflow-hidden hover:scale-[1.02] active:scale-95 ${
                                        isJustJoined 
                                        ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                        : activeGroup?.id === group.id 
                                        ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 border-teal-500/50 shadow-lg' 
                                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/80 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold truncate max-w-[170px] ${activeGroup?.id === group.id ? 'text-teal-400' : 'text-slate-200 group-hover:text-white'}`}>
                                                {group.name}
                                            </h3>
                                        </div>
                                        {/* Timestamp always visible like WhatsApp */}
                                        <span className={`text-[10px] font-mono ${unread ? 'text-teal-400 font-bold' : 'text-slate-500'}`}>
                                            {group.lastMessageAt?.seconds ? new Date(group.lastMessageAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-slate-500 line-clamp-1 flex-1 mr-4">
                                            {group.description}
                                        </p>
                                        
                                        {/* Indicators */}
                                        <div className="flex items-center gap-2">
                                            {group.type === 'ai' && activeTab !== 'ai' && <Sparkles className="w-3 h-3 text-violet-400" />}
                                            
                                            {/* Unread Badge Logic */}
                                            {unread && (
                                                <div className="flex items-center gap-1 bg-teal-500 text-slate-900 px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]">
                                                    {activeTab === 'messages' && <MessageSquare className="w-2.5 h-2.5 fill-current" />}
                                                    <span className="text-[9px] font-bold">New</span>
                                                </div>
                                            )}
                                            
                                            {/* Read Check for My Chats */}
                                            {!unread && activeTab === 'messages' && (
                                                <Check className="w-3 h-3 text-slate-600" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* FAB: Create Group (Mobile & Desktop List) */}
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="absolute bottom-6 right-6 p-4 bg-violet-600 rounded-full text-white shadow-xl shadow-violet-500/30 hover:bg-violet-500 hover:scale-110 transition-all z-20 group"
                    title="Create New Community"
                >
                    <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            {/* --- RIGHT PANEL: CHAT WINDOW --- */}
            <div className={`
                flex-col bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden relative shadow-2xl transition-all
                lg:flex lg:flex-1
                ${mobileView === 'chat' ? 'flex w-full absolute inset-0 z-30 bg-slate-900 animate-slide-up' : 'hidden'}
            `}>
                {!activeGroup ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-float">
                            <MessageSquare className="w-10 h-10 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Select a Community</h3>
                        <p className="max-w-md">
                            Join an anonymous circle to share your thoughts without judgment. 
                            Your identity is hidden behind a unique alias in every group.
                        </p>
                    </div>
                ) : (
                    <div 
                        key={activeGroup.id} 
                        className="flex flex-col h-full animate-fade-in relative transition-all duration-700"
                        style={currentTheme}
                    >
                        {/* Overlay to dim background pattern */}
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-0 pointer-events-none" />

                        {/* Chat Header */}
                        <div className="p-4 bg-slate-900/90 border-b border-slate-700/50 flex items-center justify-between z-10 backdrop-blur-sm shadow-sm">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setMobileView('list')}
                                    className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-transform hover:-translate-x-1"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <div>
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        {activeGroup.name}
                                        {activeGroup.type === 'ai' && <Shield className="w-3 h-3 text-violet-400" />}
                                    </h3>
                                    <p className="text-xs text-teal-500 font-mono flex items-center gap-1">
                                        <Circle className="w-2 h-2 fill-current animate-pulse" />
                                        Alias: {currentUserAlias || 'Generating...'}
                                    </p>
                                </div>
                            </div>
                            <button className="p-2 text-slate-500 hover:text-white">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative z-10">
                            <div className="py-6 text-center opacity-50">
                                <Lock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                                <p className="text-xs text-slate-500">
                                    Messages are anonymous and end-to-end moderated.<br/>
                                    Be kind to your peers.
                                </p>
                            </div>
                            
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderAlias === currentUserAlias;
                                const showAvatar = idx === 0 || messages[idx-1].senderAlias !== msg.senderAlias;
                                const count = replyCounts[msg.id] || 0;

                                return (
                                    <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in-up group/msg transition-all duration-300 rounded-xl`}>
                                        
                                        {/* Avatar & Name */}
                                        {showAvatar && !isMe && (
                                            <span className="text-[10px] text-slate-500 mb-1 px-1">
                                                {msg.senderAlias}
                                            </span>
                                        )}

                                        <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            
                                            {/* Reply Context Bubble */}
                                            {msg.replyToId && (
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); msg.replyToId && scrollToMessage(msg.replyToId); }}
                                                    className={`text-xs p-2 rounded-xl mb-[-10px] z-0 opacity-90 border flex items-center gap-2 cursor-pointer transition-colors hover:opacity-100 ${
                                                        isMe ? 'bg-teal-900/50 border-teal-800 text-teal-200 mr-2 rounded-br-none hover:bg-teal-900' : 'bg-slate-800/50 border-slate-700 text-slate-400 ml-2 rounded-bl-none hover:bg-slate-800'
                                                    }`}
                                                    title="Click to jump to message"
                                                >
                                                    <CornerDownRight className="w-3 h-3" />
                                                    <div className="min-w-0 pointer-events-none">
                                                        <p className="font-bold text-[9px] uppercase">Replying to {msg.replyToAlias}</p>
                                                        <p className="truncate line-clamp-1 max-w-[150px] italic">"{msg.replyToContent}"</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Main Message Bubble */}
                                            <div className="relative group/bubble">
                                                <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-md z-10 relative break-words ${
                                                    isMe 
                                                    ? 'bg-teal-600 text-white rounded-tr-sm' 
                                                    : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                                                }`}>
                                                    {msg.content}
                                                </div>

                                                {/* Reply Button (Hover) */}
                                                <button 
                                                    onClick={() => setReplyingTo({ id: msg.id, alias: msg.senderAlias, content: msg.content })}
                                                    className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-700 text-slate-300 shadow-lg opacity-0 group-hover/bubble:opacity-100 transition-all z-20 hover:bg-white hover:text-slate-900 ${
                                                        isMe ? '-left-8' : '-right-8'
                                                    }`}
                                                    title="Reply"
                                                >
                                                    <Reply className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1 px-1">
                                            <span className="text-[9px] text-slate-600">
                                                {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                            </span>
                                            {count > 0 && (
                                                <div className="flex items-center gap-1 text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md border border-teal-500/20">
                                                    <MessageSquare className="w-2.5 h-2.5" />
                                                    <span>{count}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-slate-900 border-t border-slate-800 relative z-20">
                            
                            {/* Reply Banner */}
                            {replyingTo && (
                                <div className="absolute bottom-full left-0 right-0 p-3 bg-slate-800/90 backdrop-blur-md border-t border-slate-700 flex justify-between items-center animate-slide-down shadow-xl z-0">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-1 h-8 bg-teal-500 rounded-full"></div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-teal-400 font-bold flex items-center gap-1">
                                                <Reply className="w-3 h-3" /> Replying to {replyingTo.alias}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-md opacity-80 italic">"{replyingTo.content}"</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 z-10 bg-slate-900">
                                <input 
                                    className="flex-1 bg-slate-800 text-white rounded-xl pl-4 pr-4 py-3 outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500 border border-slate-700/50 transition-all shadow-inner"
                                    placeholder={replyingTo ? "Type your reply..." : `Message as ${currentUserAlias}...`}
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                />
                                <button 
                                    type="submit" 
                                    disabled={sending || !messageInput.trim()}
                                    className="p-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:bg-slate-700 shadow-lg hover:scale-105 active:scale-95"
                                >
                                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* CREATE GROUP MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-700 shadow-2xl relative bg-[#0f172a]">
                        <button 
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h3 className="text-xl font-bold text-white mb-1">Create Community</h3>
                        <p className="text-xs text-slate-400 mb-6">Start a new anonymous circle for students.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Group Name</label>
                                <input 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition-colors"
                                    placeholder="e.g. Coding Club"
                                    value={newGroupData.name}
                                    onChange={e => setNewGroupData({...newGroupData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Description</label>
                                <textarea 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none resize-none h-24 transition-colors"
                                    placeholder="What is this group about?"
                                    value={newGroupData.desc}
                                    onChange={e => setNewGroupData({...newGroupData, desc: e.target.value})}
                                />
                            </div>
                            <button 
                                onClick={handleCreateGroup}
                                disabled={!newGroupData.name.trim()}
                                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 hover:shadow-lg"
                            >
                                Launch Community
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};