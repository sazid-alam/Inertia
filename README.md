# Inertia.edu — Proof-of-Thought at Every Push

> **Inertia intercepts `git push` — the exact moment a student ships code — and blocks it until they prove they understand what they just wrote.** 

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://inertia-tau.vercel.app)
[![API Status](https://img.shields.io/badge/API-railway-blue)](https://inertia-production-e090.up.railway.app/health)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

---

## The Problem

CS education has a copy-paste problem. Students can submit working code they don't understand — pulling solutions from the internet, using AI autocomplete, or copying a classmate — and no checkpoint exists between "code that runs" and "knowledge that sticks." Traditional quizzes are decoupled from the act of writing code, and code reviews happen too late. By the time an instructor reads the submission, the learning moment has passed.

## Our Solution

**Inertia sits inside `git` itself.** A lightweight `pre-push` hook intercepts every commit, computes a *Friction Coefficient* from the diff, and — if the commit is non-trivial — blocks the push and opens a browser window showing an **AI-generated variable-trace puzzle built from the student's own code**. The push only proceeds after the student answers correctly. If they fail, they enter a short *reflection period* before they can push again. No retry spam. No grinding. Just the five minutes of focused thinking that turns code into learning.

> *"Friction isn't the enemy of learning — it is the learning."*

---

## Live Demo

| Role | URL |
|---|---|
| 🎓 Student puzzle page | **[inertia-tau.vercel.app/student](https://inertia-tau.vercel.app/student)** |
| 👩‍🏫 Instructor dashboard | **[inertia-tau.vercel.app/dashboard](https://inertia-tau.vercel.app/dashboard)** |
| 🔌 REST API (health) | **[inertia-production-e090.up.railway.app/health](https://inertia-production-e090.up.railway.app/health)** |
| 📖 Interactive API docs | **[inertia-production-e090.up.railway.app/docs](https://inertia-production-e090.up.railway.app/docs)** |

---

## How It Works

```
Student types: git push
        │
        ▼
┌─────────────────────────────────────┐
│  pre-push git hook  (inertia-cli)   │
│  reads the diff from stdin          │
└────────────────┬────────────────────┘
                 │  POST /audit  (diff + student_id + project_id)
                 ▼
┌─────────────────────────────────────┐
│  Inertia Backend  (FastAPI)         │
│                                     │
│  Friction Coefficient               │
│    Fc = L + 2R + N                  │
│         │   │   └─ nesting depth    │
│         │   └───── recursive calls  │
│         └───────── lines changed    │
│                                     │
│  Difficulty: TRIVIAL / EASY /       │
│              MEDIUM / HARD          │
└────────────────┬────────────────────┘
                 │
         Fc > threshold?
        /              \
      NO               YES
      │                 │  POST /puzzle
      │                 ▼
      │  ┌──────────────────────────────┐
      │  │  Gemini AI generates a       │
      │  │  variable-trace puzzle from  │
      │  │  the student's own diff.     │
      │  │  Falls back to curated bank  │
      │  │  if AI is unavailable.       │
      │  └────────────┬─────────────────┘
      │               │  returns token_id + puzzle URL
      │               ▼
      │  Terminal shows:
      │    INERTIA: PROOF-OF-THOUGHT REQUIRED
      │    Open: https://inertia-tau.vercel.app/student?token=...
      │    Time limit: 120s  — waiting for verification...
      │               │
      │        Student opens URL in browser,
      │        reads puzzle about their code,
      │        types their answer, submits.
      │               │  POST /verify
      │               ▼
      │  ┌──────────────────────────────┐
      │  │  Gemini evaluates answer     │
      │  │  semantically (not just      │
      │  │  string equality).           │
      │  └────────────┬─────────────────┘
      │       ✅ Correct?  ❌ Wrong?
      │           │              │
      │       JWT issued   Reflection period
      │           │         (lockout, try again later)
      ▼           ▼
   Push allowed ← hook polls /puzzle/{token}/status
```

---

## Features

### 🧠 Proof-of-Thought Puzzles
Every puzzle is generated **from the student's own diff** by Google Gemini. It asks the student to trace a variable, predict a breakpoint value, or explain a return value — the kind of question that's impossible to answer without actually understanding the code. A curated fallback bank ensures puzzles are always available, even without internet access.

### 📐 Friction Coefficient
The formula `Fc = L + 2R + N` weights recursive calls double because recursion is the #1 source of cargo-cult code in CS courses. Nesting depth catches spaghetti logic. Line count catches copy-paste dumps. Trivial commits (typos, whitespace, documentation) pass through silently — only meaningful code changes require proof.

### 👩‍🏫 Instructor Dashboard
A real-time SSE dashboard gives instructors a live view of:
- Every student's last puzzle result and solve time
- Current lockouts with time remaining (and a manual override)
- Authenticity flags (unusually fast solves, implausible answer patterns)
- Concept heatmap: which topics (recursion, DP, graphs, trees…) students are struggling with

### 🔄 Graceful Degradation
If the backend is unreachable, the hook prints a warning and allows the push. Students are never blocked by infrastructure. The system is designed to add friction when it can, never to break a workflow.

### 🏫 Project & Join Code System
Instructors create a project and share a 6-character join code. Students run `inertia init`, enter the code, and every subsequent push in that repo is tracked under that project. No accounts, no passwords — just git.

---

## Quick Start

### For Students

```bash
# 1. Install the CLI (one-time, per machine)
pipx install inertia-edu

# Alternative if pipx is unavailable:
pip install inertia-edu

# 2. In your assignment repo (must be empty — before your first commit)
inertia init
# Enter the join code your instructor gave you
# Enter your student ID (defaults to your git email)

# 3. Work normally. Inertia only activates on complex pushes.
git add . && git commit -m "implement BFS" && git push
# → [INERTIA] Analyzing commit...
# → INERTIA: PROOF-OF-THOUGHT REQUIRED
# → Open: https://inertia-tau.vercel.app/student?token=...
```

**Diagnostics:**
```bash
inertia status    # show current repo config
inertia doctor    # check hook + config are installed
inertia repair    # reinstall the git hook if it is deleted or corrupted
inertia update    # upgrade the installed CLI package
```

### For Instructors

1. **Create a project** via the API (or use the dashboard create flow):
   ```bash
   curl -X POST https://inertia-production-e090.up.railway.app/projects \
     -H "Content-Type: application/json" \
     -d '{"name": "CS101 Assignment 3", "instructor_id": "prof@university.edu"}'
   # → {"join_code": "ABC123", ...}
   ```

2. **Share the join code** (`ABC123`) with your students.

3. **Monitor live** at `https://inertia-tau.vercel.app/dashboard?project_id=ABC123`

---

## Architecture

```
┌──────────────┐     git hook      ┌──────────────────────────────┐
│  Student's   │ ───────────────► │   Inertia Backend (FastAPI)  │
│  local repo  │                  │   Railway · Python 3.12       │
│  + CLI hook  │ ◄─────────────── │   Gemini AI + fallback bank   │
└──────────────┘   token + URL    │   In-memory · optional Redis  │
                                  └──────────────┬───────────────┘
                                                 │  REST / SSE
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │   Inertia Frontend (React)   │
                                  │   Vercel · TypeScript + Vite  │
                                  │   Student puzzle · Dashboard  │
                                  └──────────────────────────────┘
```

### Repository Layout

| Path | What's in it |
|---|---|
| `inertia-backend/` | FastAPI service: audit, puzzle generation, verify, dashboard, JWT, projects |
| `inertia-frontend/` | React + TypeScript + Vite + Tailwind: student puzzle page, instructor dashboard |
| `inertia_cli/` | Installable Python package that exposes the `inertia` console command |
| `inertia-cli/` | Bootstrap-compatible CLI source and platform hook templates |
| `install.sh` | One-liner bootstrap: copies CLI + hook to `~/.inertia/`, adds to PATH |

---

## API Reference

All endpoints are live at `https://inertia-production-e090.up.railway.app`. Interactive docs at [`/docs`](https://inertia-production-e090.up.railway.app/docs).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/audit` | Compute Fc, difficulty, and whether a puzzle is required |
| `POST` | `/puzzle` | Generate a Proof-of-Thought puzzle; returns `token_id` |
| `GET` | `/puzzle/{token_id}/status` | Poll for `pending` / `verified` / `expired` |
| `POST` | `/verify` | Submit student answer; returns JWT on success or triggers lockout |
| `POST` | `/projects` | Create a new instructor project and get a join code |
| `GET` | `/projects/{join_code}` | Look up project by join code |
| `POST` | `/projects/{join_code}/join` | Enrol a student in a project |
| `GET` | `/dashboard/status` | All students' current puzzle status |
| `GET` | `/dashboard/lockouts` | Active lockouts with time remaining |
| `GET` | `/dashboard/authenticity` | Authenticity flags per student |
| `GET` | `/dashboard/stream` | SSE stream of live dashboard updates |
| `GET` | `/dashboard/heatmap` | Concept difficulty heatmap |
| `DELETE` | `/dashboard/lockout/{student_id}` | Instructor override: clear a lockout |
| `GET` | `/health` | Service liveness check |

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI puzzle generation | Google Gemini (`gemini-2.0-flash`) |
| AI answer evaluation | Gemini (semantic matching, not just string equality) |
| Backend | Python 3.12, FastAPI, Uvicorn, PyJWT |
| Backend hosting | Railway (always-on, free tier) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Frontend hosting | Vercel |
| Real-time updates | Server-Sent Events (SSE) with polling fallback |
| Git integration | Bash `pre-push` hook + single-file Python CLI |
| Storage | In-memory (default) / Redis (optional, `USE_REDIS=true`) |

---

## Running Locally

### Backend
```bash
cd inertia-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set GEMINI_API_KEY and JWT_SECRET
uvicorn app.main:app --reload --port 8000
# API at http://localhost:8000 · docs at http://localhost:8000/docs
```

### Frontend
```bash
cd inertia-frontend
npm install
cp .env.example .env.local    # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
# App at http://localhost:5173
```

### Tests
```bash
cd inertia-backend && pytest tests -v
cd inertia-frontend && npm run lint && npm run build
```

---

## Why This Wins

Most "learning tools" sit beside a student's workflow. Inertia is **inside** it. There's no new app to open, no LMS to log into, no homework to remember to submit. The teaching moment arrives at the exact instant of greatest relevance — the second after the student wrote the code — and it asks precisely the question that reveals whether the code was understood or just assembled. That is the mechanism CS education has been missing.

---

## License

MIT — see [LICENSE](LICENSE)

