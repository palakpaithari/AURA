
import { db, sendNotification } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { UserProfile, Badge } from '../types';

export const BADGES = {
    FIRST_STEP: { id: 'first_step', name: 'First Step', icon: '🌱', description: 'Completed your first activity' },
    STREAK_3: { id: 'streak_3', name: 'Consistency Is Key', icon: '🔥', description: 'Reached a 3-day streak' },
    STREAK_7: { id: 'streak_7', name: 'Unstoppable', icon: '🚀', description: 'Reached a 7-day streak' },
    FOCUS_MASTER: { id: 'focus_master', name: 'Deep Worker', icon: '🧠', description: 'Completed a Focus Session' },
    JOURNAL_GURU: { id: 'journal_guru', name: 'Mindful Soul', icon: '✍️', description: 'Shared a Journal Entry' },
    EARLY_BIRD: { id: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'Activity before 8 AM' },
    NIGHT_OWL: { id: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'Activity after 11 PM' }
};

export const updateGamification = async (userId: string, activityType: 'focus' | 'journal') => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data() as UserProfile;
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const hour = now.getHours();
        const lastActive = userData.lastActiveDate;

        let newStreak = userData.streakDays || 0;

        // 1. Streak Logic
        if (lastActive !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastActive === yesterdayStr) {
                newStreak += 1;
            } else {
                newStreak = 1; // Reset or Start new streak
            }
        }

        // 2. Identify New Badges
        const newBadges: Badge[] = [];
        const currentBadgeIds = new Set((userData.badges || []).map(b => b.id));

        const addBadge = (badgeTemplate: any) => {
            if (!currentBadgeIds.has(badgeTemplate.id)) {
                newBadges.push({ ...badgeTemplate, earnedAt: Timestamp.now() });
                // Also trigger notification for badge
                sendNotification(userId, "New Badge Unlocked!", `You earned: ${badgeTemplate.name}`, 'success');
            }
        };

        // Badge: First Step
        addBadge(BADGES.FIRST_STEP);

        // Badge: Activity Specific
        if (activityType === 'focus') addBadge(BADGES.FOCUS_MASTER);
        if (activityType === 'journal') addBadge(BADGES.JOURNAL_GURU);

        // Badge: Time Specific
        if (hour < 8) addBadge(BADGES.EARLY_BIRD);
        if (hour >= 23) addBadge(BADGES.NIGHT_OWL);

        // Badge: Streaks
        if (newStreak >= 3) addBadge(BADGES.STREAK_3);
        if (newStreak >= 7) addBadge(BADGES.STREAK_7);

        // 3. Update Firestore
        const updates: any = {
            lastActiveDate: today,
            streakDays: newStreak
        };

        if (newBadges.length > 0) {
            updates.badges = arrayUnion(...newBadges);
        }

        await updateDoc(userRef, updates);
        
        return { newStreak, newBadges };
    } catch (e) {
        console.error("Gamification Error:", e);
        return null;
    }
};
