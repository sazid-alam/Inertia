# Inertia.edu — Judge's Evaluation Guide

> **TL;DR** — Inertia intercepts `git push` and blocks it until the student proves they understand the code they just wrote. Everything is live. No installation required to evaluate.

---

## Table of Contents

1. [What Is Inertia?](#1-what-is-inertia)
2. [Live Demo — No Setup Required](#2-live-demo--no-setup-required)
3. [How to Evaluate in 5 Minutes](#3-how-to-evaluate-in-5-minutes)
4. [Full User Walkthrough](#4-full-user-walkthrough)
   - [Instructor Flow](#41-instructor-flow)
   - [Student Flow](#42-student-flow)
5. [How It Works — Technical Deep Dive](#5-how-it-works--technical-deep-dive)
6. [Repository Layout](#6-repository-layout)
7. [Running Locally](#7-running-locally)
8. [API Reference](#8-api-reference)
9. [Design Decisions](#9-design-decisions)

---

## 1. What Is Inertia?

CS students submit code they didn't write. Existing tools (plagiarism checkers, AI detectors) react after the fact. **Inertia acts at the moment of submission** — when the student runs `git push`.

A lightweight `pre-push` git hook intercepts every commit, computes a **Friction Coefficient** (a complexity score based on lines changed, recursion depth, and nesting), and — if the code is non-trivial — blocks the push and opens a browser window showing an **AI-generated puzzle built from the student's own diff**. The push only succeeds after the student answers correctly.

### Core Loop

```
git push
  → hook captures the diff
  → backend scores complexity (Friction Coefficient)
  → if score > threshold: Gemini generates a variable-trace puzzle from the diff
  → terminal shows puzzle URL + countdown
  → student opens URL in browser, answers puzzle
  → Gemini evaluates answer semantically
  → correct ✅ → push proceeds   |   wrong ❌ → lockout, retry later
```

---

## 2. Live Demo — No Setup Required

All three components are deployed and running:

| Component | URL |
|---|---|
| 🎓 Student puzzle page | **[inertia-tau.vercel.app/student](https://inertia-tau.vercel.app/student)** |
| 👩‍🏫 Instructor dashboard | **[inertia-tau.vercel.app/dashboard](https://inertia-tau.vercel.app/dashboard)** |
| 🏠 Landing page | **[inertia-tau.vercel.app](https://inertia-tau.vercel.app)** |
| 🔌 REST API (health) | **[inertia-production-e090.up.railway.app/health](https://inertia-production-e090.up.railway.app/health)** |
| 📖 Interactive API docs | **[inertia-production-e090.up.railway.app/docs](https://inertia-production-e090.up.railway.app/docs)** |

---

## 3. How to Evaluate in 5 Minutes

You can test the full system end-to-end **without installing anything**, using only `curl` and a browser.

### Step 1 — Create an instructor project

```bash
curl -s -X POST https://inertia-production-e090.up.railway.app/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Judge Demo", "teacher_id": "judge@example.com"}' | python3 -m json.tool
```

Note the `join_code` in the response (e.g. `"join_code": "ABC123"`).

### Step 2 — Simulate a student push (the audit + puzzle pipeline)

```bash
# Score a trivial change — should NOT require a puzzle
curl -s -X POST https://inertia-production-e090.up.railway.app/audit \
  -H "Content-Type: application/json" \
  -d '{
    "diff": "+# fix typo\n",
    "student_id": "alice@uni.edu",
    "project_id": "YOUR_PROJECT_ID_HERE",
    "commit_hash": "abc1234",
    "commit_message": "fix typo"
  }' | python3 -m json.tool
```

```bash
# Score a complex recursive function — SHOULD require a puzzle
curl -s -X POST https://inertia-production-e090.up.railway.app/audit \
  -H "Content-Type: application/json" \
  -d '{
    "diff": "+def fib(n):\n+    if n <= 1:\n+        return n\n+    return fib(n-1) + fib(n-2)\n",
    "student_id": "alice@uni.edu",
    "project_id": "YOUR_PROJECT_ID_HERE",
    "commit_hash": "abc1234",
    "commit_message": "implement fibonacci"
  }' | python3 -m json.tool
```

### Step 3 — Generate a puzzle

```bash
curl -s -X POST https://inertia-production-e090.up.railway.app/puzzle \
  -H "Content-Type: application/json" \
  -d '{
    "diff": "+def fib(n):\n+    if n <= 1:\n+        return n\n+    return fib(n-1) + fib(n-2)\n",
    "fc_score": 10,
    "difficulty": "MEDIUM",
    "student_id": "alice@uni.edu",
    "project_id": "YOUR_PROJECT_ID_HERE",
    "commit_hash": "abc1234",
    "commit_message": "implement fibonacci"
  }' | python3 -m json.tool
```

Copy the `token_id` from the response.

### Step 4 — Open the student puzzle UI

Paste this URL in your browser (replace `TOKEN_ID`):

```
https://inertia-tau.vercel.app/student?token=TOKEN_ID
```

You will see the AI-generated puzzle based on the Fibonacci diff. Type your answer and submit.

### Step 5 — Check the puzzle status

```bash
curl -s https://inertia-production-e090.up.railway.app/puzzle/TOKEN_ID/status | python3 -m json.tool
```

After a correct answer the status transitions to `"verified"`.

### Step 6 — View the instructor dashboard

Open the dashboard URL with your project's ID:

```
https://inertia-tau.vercel.app/dashboard?project_id=YOUR_PROJECT_ID_HERE
```

You will see live student status, solve times, lockouts, and the concept difficulty heatmap — all updating in real time via SSE.

---

## 4. Full User Walkthrough

### 4.1 Instructor Flow

1. **Create a project** — POST `/projects` with a `name` and `teacher_id`. Receive a 6-character `join_code`.
2. **Share the join code** with students (e.g. post it on the course LMS).
3. **Monitor** via `https://inertia-tau.vercel.app/dashboard?project_id=<id>` — live SSE stream, no refresh needed.
4. **Override lockouts** — a student who failed too many times can be unlocked via the dashboard or `DELETE /dashboard/lockout/{student_id}`.
5. **Review authenticity flags** — the dashboard highlights students who solved puzzles suspiciously quickly or showed implausible patterns.

### 4.2 Student Flow

**One-time setup (per machine)**

```bash
# Option A — from the deployed install script
curl -fsSL https://inertia-production-e090.up.railway.app/install | bash
source ~/.bashrc   # reload PATH

# Option B — from the cloned repo
bash install.sh
source ~/.bashrc
```

**Per-repository setup (must have zero commits)**

```bash
cd my-assignment-repo
inertia init
# → Enter join code: ABC123
# → Student ID [your.git@email.com]: (press Enter to accept)
# → ✓ Joined project: CS101 Assignment 3 (ABC123)
# → ✓ Inertia initialized. Every push now requires Proof-of-Thought.
```

This creates `.inertia/config` and installs a `pre-push` hook in `.git/hooks/`.

**Normal workflow**

```bash
git add . && git commit -m "implement DFS" && git push
# → [INERTIA] Analyzing commit...
# → [INERTIA] Trivial commit. Push allowed.     ← for simple changes

git add . && git commit -m "implement recursive merge sort" && git push
# → [INERTIA] Analyzing commit...
# →
# → ========================================
# → INERTIA: PROOF-OF-THOUGHT REQUIRED
# → ========================================
# →
# →   Open this URL in your browser and solve the puzzle:
# →
# →   https://inertia-tau.vercel.app/student?token=<uuid>
# →
# →   Time limit: 120s
# →   Waiting for verification...
# → ========================================
# → [INERTIA] Waiting... 117s remaining
```

**Diagnostics**

```bash
inertia status   # print current project/student config
inertia doctor   # verify hook + config are both installed
```

---

## 5. How It Works — Technical Deep Dive

### Friction Coefficient

```
Fc = L + 2R + N
     │   │   └── nesting depth (max if/for/while depth in diff)
     │   └────── recursive calls × 2 (weighted double)
     └────────── lines added (capped at MAX_DIFF_LINES=200)
```

| Fc range | Difficulty | Puzzle? |
|---|---|---|
| < 5 | TRIVIAL | ❌ No |
| 5–14 | EASY | ✅ Yes |
| 15–29 | MEDIUM | ✅ Yes |
| ≥ 30 | HARD | ✅ Yes |

The weighting of recursive calls (×2) is intentional: recursion is the #1 source of cargo-cult code in CS courses.

### Puzzle Generation

1. The diff is sent to **Google Gemini (`gemini-2.5-pro`)** with a prompt that asks it to generate a variable-trace puzzle (predict a variable's value at a breakpoint, or the return value of a function call).
2. The puzzle is always derived from the student's own code — it cannot be answered by someone who just copied the code without understanding it.
3. If Gemini is unavailable, a curated fallback puzzle bank is used so the hook never silently allows a push.

### Answer Verification

The student's answer is evaluated by a second Gemini call that performs **semantic matching** — "17", "seventeen", and "the function returns 17" are all accepted as correct. String equality is not used.

### Lockout

A wrong answer triggers an exponential lockout (60 s → 120 s → …). The student must wait before pushing again. Instructors can override this from the dashboard.

### Graceful Degradation

If the backend is unreachable (no internet, server down), the hook prints a warning and **allows the push**. Students are never permanently blocked by infrastructure failures.

---

## 6. Repository Layout

```
Inertia/
├── inertia-backend/       FastAPI service (Python 3.12)
│   ├── app/
│   │   ├── main.py        FastAPI app factory, CORS, router registration
│   │   ├── config.py      Pydantic settings (env vars / .env)
│   │   ├── models.py      All request/response Pydantic models
│   │   ├── routers/       One file per endpoint group
│   │   │   ├── audit.py   POST /audit — Friction Coefficient calculation
│   │   │   ├── puzzle.py  POST /puzzle — AI puzzle generation
│   │   │   ├── verify.py  POST /verify — answer evaluation + JWT
│   │   │   ├── dashboard.py GET /dashboard/* — SSE + analytics
│   │   │   └── projects.py  POST/GET /projects — project management
│   │   ├── services/
│   │   │   ├── ast_parser.py         Fc computation from diff text
│   │   │   ├── puzzle_factory.py     Gemini prompt + fallback bank
│   │   │   ├── jwt_service.py        JWT issue / validate
│   │   │   ├── lockout.py            Lockout state machine
│   │   │   └── commit_classifier.py  Concept tagging (recursion, DP, …)
│   │   └── storage/store.py          In-memory store (optional Redis)
│   ├── tests/             Pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
│
├── inertia-frontend/      React 18 + TypeScript + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── Puzzle/    Student puzzle UI + answer form
│       │   ├── Dashboard/ Instructor view (SSE, heatmap, lockout override)
│       │   └── Landing/   Project home page
│       ├── api/           Typed API client wrappers
│       ├── components/    Shared UI components
│       └── hooks/         Custom React hooks (SSE, polling)
│
├── inertia-cli/
│   ├── inertia.py         CLI (`inertia init / status / doctor`)
│   └── pre-push           Bash git hook (diff → audit → puzzle → poll)
│
├── install.sh             One-liner bootstrap script
└── README.md
```

---

## 7. Running Locally

### Prerequisites

- Python 3.12+
- Node.js 18+
- A Google Gemini API key (get one free at [aistudio.google.com](https://aistudio.google.com))

### Backend

```bash
cd inertia-backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set:
#   GEMINI_API_KEY=your_key_here
#   JWT_SECRET=any-random-secret
uvicorn app.main:app --reload --port 8000
# API: http://localhost:8000
# Interactive docs: http://localhost:8000/docs
```

Key `.env` variables:

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(none)* | Required for AI puzzles; fallback bank used if absent |
| `JWT_SECRET` | `inertia-super-secret-change-in-prod` | Change in production |
| `USE_REDIS` | `false` | Set to `true` to persist state across restarts |
| `REDIS_URL` | `redis://localhost:6379/0` | Used only when `USE_REDIS=true` |
| `MAX_DIFF_LINES` | `200` | Cap on `L` in the Fc formula |
| `PUZZLE_TTL_SECONDS` | `600` | How long a puzzle token lives |

### Frontend

```bash
cd inertia-frontend
npm install
cp .env.example .env.local
# Edit .env.local and set:
#   VITE_API_BASE_URL=http://localhost:8000
npm run dev
# App: http://localhost:5173
```

### CLI (pointing at local backend)

```bash
# Install the CLI globally
bash install.sh
source ~/.bashrc

# In a fresh (zero-commit) git repo
inertia --api-base http://localhost:8000 init
```

### Tests

```bash
# Backend
cd inertia-backend && pytest tests -v

# Frontend
cd inertia-frontend && npm run lint && npm run build
```

---

## 8. API Reference

Base URL (live): `https://inertia-production-e090.up.railway.app`  
Interactive docs: [`/docs`](https://inertia-production-e090.up.railway.app/docs)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/audit` | Compute Friction Coefficient and decide if a puzzle is required |
| `POST` | `/puzzle` | Generate a puzzle; returns `token_id` + puzzle text |
| `GET` | `/puzzle/{token_id}/status` | Poll for `pending` / `verified` / `expired` |
| `POST` | `/verify` | Submit answer; returns JWT on success or triggers lockout |
| `POST` | `/projects` | Create a project (instructor); returns `join_code` |
| `GET` | `/projects?teacher_id=` | List all projects by instructor |
| `GET` | `/projects/{join_code}` | Look up project by join code |
| `POST` | `/projects/{join_code}/join` | Enrol a student; called by `inertia init` |
| `GET` | `/projects/{project_id}/dashboard` | Full project dashboard data |
| `GET` | `/projects/{project_id}/students` | List enrolled students |
| `GET` | `/projects/{project_id}/commits` | All recorded commits |
| `GET` | `/projects/{project_id}/students/{student_id}` | Student profile + stats |
| `GET` | `/projects/{project_id}/students/{student_id}/commit-reconciliation` | Cross-check Inertia commits against GitHub |
| `GET` | `/dashboard/status?project_id=` | Student statuses (legacy global endpoint) |
| `GET` | `/dashboard/lockouts?project_id=` | Active lockouts |
| `GET` | `/dashboard/authenticity?project_id=` | Authenticity flags |
| `GET` | `/dashboard/stream?project_id=` | SSE stream of live updates |
| `GET` | `/dashboard/analytics?project_id=` | Difficulty matrix + activity feed |
| `DELETE` | `/dashboard/lockout/{student_id}?project_id=` | Instructor override: clear lockout |

### Sample request/response — `/audit`

**Request**
```json
{
  "diff": "+def fib(n):\n+    if n <= 1:\n+        return n\n+    return fib(n-1) + fib(n-2)\n",
  "student_id": "alice@uni.edu",
  "project_id": "proj_abc123",
  "commit_hash": "a1b2c3d",
  "commit_message": "implement fibonacci"
}
```

**Response**
```json
{
  "complexity_score": 12,
  "line_delta": 5,
  "recursive_calls": 2,
  "nesting_depth": 1,
  "difficulty": "EASY",
  "requires_puzzle": true,
  "requires_proof_of_intent": false
}
```

---

## 9. Design Decisions

| Decision | Rationale |
|---|---|
| **Git hook, not LMS plugin** | Meets students at the exact moment they push code, not after. No new app to log into. |
| **Single-file CLI (`inertia.py`)** | Portable; zero Python dependencies beyond stdlib. Works on macOS, Linux, Windows (via `py -3`). |
| **Friction Coefficient weighting (R×2)** | Recursive code is the most commonly copied. The formula penalises it harder than simple line additions. |
| **Semantic answer evaluation via Gemini** | Students shouldn't fail for writing "17" vs "returns 17". Correctness is what matters. |
| **Fallback puzzle bank** | Infrastructure outages never silently cancel the learning check — they fall back to curated puzzles. |
| **Graceful push-through when backend unreachable** | If the server is down, the push is *allowed* (with a warning). Student deadlines are never held hostage by infrastructure. |
| **In-memory storage (default)** | Zero-dependency deployment for demos and hackathons. Opt-in Redis (`USE_REDIS=true`) for persistence in production. |
| **SSE for dashboard** | Real-time updates without WebSocket complexity. Degrades cleanly to polling in restricted networks. |
| **Project join-code model** | No accounts or passwords for students — just a 6-character code shared by the instructor. |
