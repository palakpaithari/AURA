
# 🌌 Aura | The Student OS for Mental Resilience

[![Google Gemini](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Cloud](https://img.shields.io/badge/Scale-Google%20Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

> **"Your Headspace, Handled."**
>
> An invisible, behavior-first ecosystem that integrates mental well-being into the daily academic workflow. Powered by **Google Gemini**, **Firebase**, and **Vertex AI**.

---

## 📌 1. Problem Statement: The Behavioral Gap

### The Core Conflict
Universities face a **"Silent Epidemic."** 60% of students suffer from academic burnout or anxiety, yet **less than 15%** seek help.

### Why Existing Solutions Fail
1.  **Clinical Stigma:** Apps labeled "Mental Health" feel like admitting defeat.
2.  **Friction:** Students won't open a separate app when they are stressed; they doom-scroll or study harder.
3.  **Reactive vs. Proactive:** Therapy apps help *after* the breakdown. There is no tool for *prevention*.

### The Aura Solution
Aura is **NOT** a mental health app. It is a **Student Operating System**.
It wraps mental health support inside tools students *already need*—productivity timers, career simulators, and anonymous peer chats. It captures **behavioral signals** (sleep, focus, sentiment) to detect burnout **before it happens**.

---

## 🏗️ 2. Roles & Feature Ecosystem

Aura operates on a strict **Role-Based Access Control (RBAC)** model powered by Firebase Auth custom claims.

### 🎓 A. Student Role (The Daily User)
*Focus: Academic Performance & Emotional Regulation*

| Feature | Functionality | Google Tech Powering It |
| :--- | :--- | :--- |
| **Aura AI Companion** | **NEW!** A context-aware chatbot fluent in **Hinglish**, Hindi, and English. Acts as a supportive "Study Buddy" for venting and planning. | **Gemini 2.0 Flash** (System Instructions) |
| **Micro-Communities** | **NEW!** User-generated interest groups (e.g., "Coding Club") with **Anonymous Aliases** (e.g., "Neon Fox"). Features dynamic AI-generated UI themes based on group names. | **Firestore** + **React** |
| **Mindset Dashboard** | Central HUD showing "Internal Weather" (mood) vs. Sleep Debt. | **Firestore Realtime** |
| **Flow State (FocusZone)** | 40Hz Gamma wave generator & Pomodoro timer with "Group Sync" to feel presence without video. | **Web Audio API** (Client) |
| **Productivity-Emotion Nexus (PEN)** | A chart correlating focus blocks with mood dips to identify specific burnout hours. | **Recharts** + **Firestore Aggregations** |
| **Reflect (Journal)** | Private journal where AI analyzes entry sentiment to provide validation (not advice). | **Gemini 2.0 Flash API** |
| **Adaptive Rituals Engine** | AI suggests micro-habits (e.g., "Morning Sun") based on yesterday's sleep data. | **Cloud Functions** + **Gemini** |
| **Future Simulator** | Generates 3 distinct future career paths to combat "Future Anxiety" and catastrophic thinking. | **Gemini Pro** (Creative Generation) |
| **Campfire** | Anonymous, topic-based peer chat (e.g., "Exam Stress") with zero identity leakage. | **Firestore** + **Cloud Functions** |

### 🛡️ B. Peer Mentor Role (The First Responders)
*Focus: Triage, Empathy & Traffic Control*

| Feature | Functionality | Google Tech Powering It |
| :--- | :--- | :--- |
| **Control Tower** | Real-time dashboard showing the volume of stressed students and active chats. | **Firestore Listeners** |
| **Emotional Traffic Map** | Heatmap of topics (e.g., "Loneliness" is trending high velocity). | **BigQuery** (Simulated) |
| **Peer Wisdom Extraction** | AI summarizes thousands of chat logs into actionable insights (e.g., "Students fear the Physics mid-term"). | **Gemini 1.5 Pro** (Large Context Window) |
| **Burnout Prediction** | Alerts the mentor if *they* are absorbing too much trauma. | **AutoML** (Logic) |

### 🏛️ C. Admin / Institution Role (The System Architects)
*Focus: Policy, Risk & Prevention*

| Feature | Functionality | Google Tech Powering It |
| :--- | :--- | :--- |
| **Community God Mode** | Full governance over user-created groups, including banning users and deleting toxic communities. | **Firestore** (Write Batches) |
| **Dropout Radar** | Identifies students with high "Life Load" and low "Engagement" (anonymized). | **Vertex AI** (Predictive Modeling) |
| **Faculty Stress Index** | Correlates stress spikes with specific departments/faculties. | **Looker Studio** (Visualization) |
| **Policy Simulator** | "What if we delay exams by 2 days?" AI simulates the drop in stress levels. | **Gemini** (Reasoning) |

---

## 🟦 3. Google Technologies Used

This platform is a showcase of the Google Cloud & Firebase ecosystem.

### 🔥 Firebase (Serverless Backend)
*   **Authentication:** Handles Google Sign-In and Role-Based Access Control (RBAC). Prevents unauthorized access to Admin panels.
*   **Firestore (NoSQL):** The single source of truth. Uses sub-collections for high-read scalability (e.g., `campfires/{topic}/messages`). **Zero usage of Firebase Storage** (as per constraints).
*   **Cloud Functions:** Triggers AI analysis on new Journal entries and chat messages.
*   **Security Rules:** Complex logic ensuring students can NEVER read other students' private logs.

### 🤖 Google AI & Machine Learning
*   **Gemini 2.0 Flash:** Used for high-speed, low-latency tasks:
    *   **Hinglish Chat:** System instructions specifically tuned to understand and reply in mixed-script languages ("Sun na yr...").
    *   **Real-time Moderation:** Bullying/Self-harm detection in milliseconds.
    *   **Sentiment Analysis:** On Journal entries to provide instant validation.
*   **Gemini 1.5 Pro:** Used for high-reasoning tasks:
    *   **Future Simulator:** Generating detailed narrative arcs for career paths.
    *   **Wisdom Extraction:** Analyzing massive text corpuses for themes.
*   **Vertex AI (Concept):** For training custom models on "Life Load" data to predict dropout rates.

### 📊 Data & Analytics
*   **BigQuery:** Firestore data is piped here for longitudinal analysis (Faculty Stress Index).
*   **Google Analytics 4:** Tracks feature usage (Flow State vs. Campfire) to understand student behavior.

---

## 🗄️ 4. Firestore Database Schema

Designed for security, scalability, and strict isolation.

### `users` (Collection)
*   **Document ID:** `uid`
*   **Fields:**
    *   `role` (string): 'student' | 'peer_mentor' | 'admin'
    *   `collegeId` (string): For multi-tenant isolation.
    *   `status` (string): 'active' | 'pending' | 'suspended'
    *   `stressBaseline` (number): 0-100 calculated metric.

### `aiChats` (Collection)
*   **Document ID:** `chatId`
*   **Fields:**
    *   `userId` (string)
    *   `title` (string)
    *   `updatedAt` (timestamp)

### `microCommunities` (Collection)
*   **Document ID:** `groupId`
*   **Fields:**
    *   `name` (string)
    *   `type` (string): 'ai' | 'user'
    *   `createdBy` (string): 'system' | userId
    *   `memberCount` (number)

### `communityMembers` (Collection)
*   **Document ID:** `{groupId}_{userId}` (Composite Key)
*   **Fields:**
    *   `anonAlias` (string): e.g., "Neon Fox 429"
    *   `joinedAt` (timestamp)

### `journals` (Collection)
*   **Document ID:** `auto-id`
*   **Fields:**
    *   `userId` (string): Owner.
    *   `content` (string): Encrypted text.
    *   `sentiment` (string): Output from Gemini.
    *   `aiResponse` (string): Validation message from Gemini.
    *   `isPrivate` (boolean): Always true.

### `dailyCheckins` (Collection)
*   **Document ID:** `auto-id`
*   **Fields:**
    *   `userId` (string)
    *   `score` (number): 1-5 Mood score.
    *   `timestamp` (timestamp)

---

## 🔐 5. Security & Privacy

1.  **Zero-Knowledge Architecture:** Peer mentors see trends, not individual names. Admins see statistics, not journals.
2.  **AI Moderation:** Every chat message passes through a Gemini Safety Filter before reaching the database.
3.  **Role Guards:** React Router guards + Firestore Security Rules prevent privilege escalation.

---

## 🚀 6. Installation & Deployment

### Prerequisites
*   Node.js 18+
*   Firebase CLI
*   Google Cloud Platform Account (with Vertex AI enabled)

### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-username/aura-student-os.git
cd aura-student-os

# 2. Install dependencies
npm install

# 3. Environment Setup
cp .env.example .env.local
# (Fill in your Firebase & Gemini API Keys)

# 4. Run Development Server
npm run dev
```

### Production Deployment (Vercel)
Aura is optimized for Vercel edge deployment.
1.  Connect GitHub repo to Vercel.
2.  Add Environment Variables in Vercel Dashboard.
3.  Deploy.

---

## 🔮 7. Future Roadmap
*   **Q3 2025:** Integration with Google Classroom API to auto-detect exam schedules and pre-schedule "Decompression Rituals."
*   **Q4 2025:** B2B Admin Dashboards for University Counselors.
*   **2026:** Native Mobile App (Flutter) with Offline Flow State.

---

**Built with ❤️ for the Google Developer Group Hackathon.**
