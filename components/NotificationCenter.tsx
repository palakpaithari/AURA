import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, ExternalLink, MessageSquare, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db, requestNotificationPermission } from '../services/firebase';
import { Notification, UserProfile } from '../types';

export const NotificationCenter = ({ user }: { user: UserProfile }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Request browser permission on mount
        requestNotificationPermission();

        const q = query(
            collection(db, `users/${user.uid}/notifications`),
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
            setNotifications(notes);
            setUnreadCount(notes.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user.uid]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { read: true });
        } catch (e) {
            console.error(e);
        }
    };

    const markAllRead = async () => {
        const batch = writeBatch(db);
        notifications.filter(n => !n.read).forEach(n => {
            const ref = doc(db, `users/${user.uid}/notifications`, n.id);
            batch.update(ref, { read: true });
        });
        await batch.commit();
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'alert': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
            case 'message': return <MessageSquare className="w-4 h-4 text-violet-500" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            default: return <Info className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-slate-900 dark:text-white' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-white dark:ring-[#0f172a]" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllRead}
                                className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs">No new notifications.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map(note => (
                                    <div 
                                        key={note.id} 
                                        className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative ${!note.read ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''}`}
                                        onClick={() => markAsRead(note.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${
                                                !note.read ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800/50 grayscale opacity-70'
                                            }`}>
                                                {getIcon(note.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={`text-sm font-bold truncate ${!note.read ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {note.title}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                        {note.timestamp?.seconds ? new Date(note.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                                    {note.message}
                                                </p>
                                                {note.link && (
                                                    <a href={note.link} className="mt-2 inline-flex items-center text-[10px] font-bold text-violet-600 hover:text-violet-500">
                                                        View details <ExternalLink className="w-3 h-3 ml-1" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {!note.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};