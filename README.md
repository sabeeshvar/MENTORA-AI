# MENTORA AI — Multimodal, Source-Grounded & Adaptive AI Learning Companion

> **Tagline:** Learn. Adapt. Master.

MENTORA AI is a production-quality web platform that transforms raw learning materials (PDF textbooks, PPT/PPTX slide decks, and lecture recordings) into an interactive, source-grounded mastery engine. Students receive answers with precise page citations, take adaptive quizzes calibrated to their weak points, and track their topic mastery in real time.

---

## 🏗️ System Architecture

```
                       ┌─────────────────────────┐
                       │     MENTORA Web App     │
                       │  (React 19 + TypeScript │
                       │    + Vite + Tailwind)   │
                       └───────────┬─────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
      [Client SDK Services]                  [Node.js / Express API]
                │                                     │
    ┌───────────┼───────────┐                         │
    ▼           ▼           ▼                         ▼
Firebase    Firebase    Firebase                Groq AI Engine
  Auth      Firestore    Storage             (LLaMA 3.3 70B Versatile)
 (Users)    (Docs/      (PDF/PPTX/             (Fast Grounded Q&A
             Quizzes)     Videos)               & Adaptive Quizzes)
```

### Key Pillars
1. **Multimodal Ingestion Pipeline:** Supports PDFs, PowerPoint presentations, and lecture video transcripts.
2. **Strict Source Grounding:** Prevents hallucinations by bounding AI responses to indexed chunks, returning exact page numbers, slide indices, or video timestamps.
3. **Adaptive Quiz Generation:** Generates diagnostic assessments that adjust difficulty dynamically based on the learner's live mastery score.
4. **Mastery & Knowledge Analytics:** Continuously maps the student's mastery percentage, isolates conceptual weak areas, and prescribes high-yield remedial steps.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + TypeScript | High-performance reactive UI |
| **Build Tool** | Vite 6 | Instant HMR and optimized production bundles |
| **Styling** | Tailwind CSS v4 | Curated dark mode, glassmorphism, responsive styling |
| **Icons** | Lucide React | Modern, cohesive iconography |
| **Routing** | React Router v7 | Declarative routing with protected guards |
| **Auth & DB** | Firebase (Auth + Firestore + Storage) | Scalable user authentication, cloud database, and file storage |
| **Backend/API** | Node.js + Express + TypeScript (`tsx`) | Modular API server for AI pipelines and integrations |
| **AI Engine** | Groq SDK (`llama-3.3-70b-versatile`) | Ultra-fast inference for source-grounded Q&A |

---

## 📁 Repository Structure

```
MENTORA AI/
├── .env.example              # Template for environment variables
├── .env                      # Local environment configurations
├── .gitignore                # Git exclusions
├── index.html                # HTML entrypoint with metadata and fonts
├── package.json              # Unified dependencies & scripts
├── tsconfig.json             # Root TypeScript project references
├── tsconfig.app.json         # Client TypeScript configuration
├── tsconfig.node.json        # Server/Node TypeScript configuration
├── vite.config.ts            # Vite configuration with Tailwind v4 & aliases
│
├── src/                      # Frontend Application
│   ├── assets/               # Static assets
│   ├── components/           # Reusable components
│   │   ├── common/           # Button, Card, Badge, ProtectedRoute
│   │   └── layout/           # AppLayout, Sidebar, Header
│   ├── context/              # React Context (AuthContext)
│   ├── lib/                  # Utilities & Firebase integrations
│   │   ├── firebase/         # auth.ts, firestore.ts, storage.ts, config.ts
│   │   └── utils.ts          # Styling and formatting helpers
│   ├── pages/                # Application routes
│   │   ├── LandingPage.tsx   # Public showcase & value proposition
│   │   ├── LoginPage.tsx     # Firebase Auth & Reviewer Demo Mode
│   │   ├── DashboardPage.tsx # Overview & Quick Actions
│   │   ├── MaterialsPage.tsx # Multimodal upload hub & file library
│   │   ├── StudyPage.tsx     # Grounded Q&A split-view with citations
│   │   ├── QuizzesPage.tsx   # Adaptive quiz generator & practice
│   │   ├── MasteryPage.tsx   # Topic mastery & analytics breakdown
│   │   └── SettingsPage.tsx  # User profile & service connection status
│   ├── routes/               # Centralized router configuration
│   ├── types/                # Strict TypeScript data models
│   │   ├── auth.ts
│   │   ├── material.ts
│   │   ├── quiz.ts
│   │   └── mastery.ts
│   ├── App.tsx               # Root component with providers
│   ├── main.tsx              # React DOM mounting
│   └── index.css             # Tailwind v4 theme & glassmorphic utilities
│
└── server/                   # Backend API (Node.js + Express + TypeScript)
    ├── config.ts             # Environment validation (Port, Groq Key)
    ├── routes/               # Modular Express routers
    │   ├── health.ts         # Service status & environment health
    │   └── groq.ts           # Groq AI inference endpoints
    └── index.ts              # Server bootstrap & middleware
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on v24.x)
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and provide your credentials:
```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Cloud Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID |
| `GROQ_API_KEY` | Groq Cloud API key for ultra-fast LLaMA 3.3 inference |
| `PORT` | API Server port (default: 5000) |

> **Note for Judges & Reviewers:** The application includes a built-in **Reviewer Mode** and local fallback. If Firebase keys are not yet provided, you can click **"Enter Demo"** on the Login screen to explore the UI immediately.

### 4. Running the Development Server
**Frontend (Vite):**
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

**Backend API Server:**
```bash
npm run server:dev
```
API runs on [http://localhost:5000](http://localhost:5000).

### 5. Production Build & Verification
```bash
npm run build
```
Runs strict TypeScript compilation checks across client and server configurations, and builds the production Vite bundle.
