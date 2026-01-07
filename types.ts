

export type UserRole = 'student' | 'admin' | 'peer_mentor';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  status: 'active' | 'pending' | 'suspended';
  collegeId?: string; 
  department?: string; // New field for aggregation
  stressBaseline?: number;
  streakDays?: number;
  lastActiveDate?: string; // YYYY-MM-DD for streak calc
  badges?: Badge[];
  lastCheckIn?: any;
  createdAt?: any;
  authProvider?: 'google' | 'email';
  activePersona?: 'academic' | 'personal';
}

export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  aiResponse?: string;
  timestamp: any;
  isPrivate: boolean;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: any;
  isModerated: boolean;
}

// Added 'ai_companion' to ViewState
export interface ViewState {
  view: 'dashboard' | 'reflect' | 'campfire' | 'communities' | 'flow' | 'future' | 'settings' | 'admin_panel' | 'ai_companion';
}

// --- NEW CATEGORY-DEFINING METRICS ---

export interface LifeLoadMetric {
  userId: string;
  academics: number; // 0-100
  career: number;
  social: number;
  financial: number;
  health: number;
  timestamp: any;
}

export interface SleepLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  hours: number;
  quality: 'good' | 'fair' | 'poor';
  timestamp: any;
}

export interface FutureScenario {
  type: 'stable' | 'growth' | 'moonshot';
  title: string;
  narrative: string;
  confidenceScore: number;
  keyMilestone: string;
}

export interface PeerTrafficNode {
  topicId: string;
  name: string;
  velocity: 'low' | 'medium' | 'high' | 'critical';
  activeUsers: number;
  sentimentScore: number; // 0-1
}

// --- NEW FEATURES TYPES ---

export interface Ritual {
  id: string;
  title: string;
  durationMin: number;
  type: 'morning' | 'deep_work' | 'decompression';
  isCompleted: boolean;
}

export interface GroupFlowSession {
  id: string;
  activeParticipants: number;
  topic: string;
  startTime: any;
}

export interface MentorImpactAnalysis {
  score: number; // 0-100
  level: 'Novice' | 'Guardian' | 'Architect';
  strengths: string[];
  improvements: string[]; // Actionable feedback
  burnoutWarning: boolean;
  lastUpdated: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'alert' | 'message' | 'success' | 'info';
  read: boolean;
  timestamp: any;
  link?: string;
}

// --- MICRO-COMMUNITIES TYPES ---

export interface Community {
  id: string;
  name: string;
  description: string;
  type: 'ai' | 'user';
  createdBy: string; // 'system' or userId
  memberCount: number;
  isActive: boolean;
  lastMessageAt?: any;
  createdAt?: any;
}

export interface CommunityMember {
  docId?: string;
  groupId: string;
  userId: string;
  anonAlias: string; // "Neon Fox"
  joinedAt: any;
}

export interface CommunityMessage {
  id: string;
  groupId: string;
  content: string;
  senderAlias: string; // "Neon Fox"
  senderId: string; // Kept for moderation, usually hidden in UI
  createdAt: any;
  isFlagged: boolean;
  // Reply Context
  replyToId?: string;
  replyToAlias?: string;
  replyToContent?: string;
}

// --- AI COMPANION TYPES ---

export interface AIChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  language?: string;
}

export interface AIChatMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'ai';
  content: string;
  createdAt: any;
}