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
| 👩‍🏫 Instructor dashboard | **[inertia-tau.vercel.app/dashboard](https://inertia-tau.vercel.app/dashboard)** |
| 🔌 REST API (health) | **[inertia-production-e090.up.railway.app/health](https://inertia-production-e090.up.railway.app/health)** |
| 📖 Interactive API docs | **[inertia-production-e090.up.railway.app/docs](https://inertia-production-e090.up.railway.app/docs)** |

---

## The Friction That Helps

Most friction in software is accidental. A slow API. A clunky UI. A process that wasn't designed. That kind of friction should be removed.

Inertia introduces **intentional friction** — friction with a purpose, placed at the moment of maximum relevance.

Here is what makes it different from a quiz or a test:

**It is contextual.** The puzzle is generated from the student's actual diff. Not a generic recursion question — a question about *this function*, *these variables*, *this return value*. It cannot be googled. It cannot be copy-pasted. It requires reading the code that was just written.

**It is immediate.** The checkpoint arrives at the exact second after the student wrote the code — not days later during a code review, not at the end of the semester in an exam. The code is still live in their working memory. The question lands when it can actually teach.

**It is proportional.** A three-line bug fix passes through silently. A recursive algorithm with four levels of nesting triggers a puzzle. The system doesn't punish productivity — it gates complexity.

**It cannot be skipped passively.** A student who doesn't understand their own code will fail the puzzle and enter a short reflection period before they can push again. Not a lockout. Not a punishment. Just five minutes of forced re-engagement with what they wrote.

**It is honest.** The system doesn't try to catch cheaters. It tries to manufacture the conditions under which a student is most likely to actually learn. Those are different goals, and Inertia only pursues the second one.

---

## What the Instructor Sees

While the student is at the gate, the instructor has a live view of everything:

- Every student's last puzzle result and how long it took to solve
- Active reflection periods with time remaining — and a manual override if needed
- Authenticity flags for suspiciously fast answers or implausible patterns
- A concept heatmap showing which topics (recursion, dynamic programming, graphs, trees) the class is struggling with in real time

The dashboard is not a surveillance tool. It is a signal — a way for instructors to see which concepts need more class time before the final exam, not after.

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

## Future Plans

### 🧩 Interactive Puzzles with Hints & Better Puzzle Quality

The current puzzle system generates a single trace-the-variable question and gives the student one attempt before locking them out. The next evolution makes the puzzle experience genuinely instructional rather than just a gate:

- **Step-by-step hint system** — after a wrong answer the student can unlock a hint (e.g., "look at the value of `n` when the base case is reached") that nudges them toward the answer without giving it away. Hints are themselves AI-generated from the diff so they stay contextually relevant.
- **Multi-part puzzles** — for `HARD` commits, the student answers a short sequence of micro-questions (predict line 5 output → identify the off-by-one → state what the refactored version would return) so that a single luckily correct guess can no longer pass the gate.
- **Puzzle difficulty calibration** — the Friction Coefficient already classifies commits as TRIVIAL / EASY / MEDIUM / HARD; puzzle complexity and hint availability will be tied directly to those tiers so trivial commits get a lightweight 10-second check and hard ones get a full interactive walkthrough.
- **Curated puzzle bank improvements** — the offline fallback bank will be expanded with community-reviewed questions tagged by concept (recursion, dynamic programming, graph traversal, tree operations, sorting) so that even without AI the student receives a question that is accurate and pedagogically sound.
- **Peer-reviewed puzzle quality scores** — instructors will be able to flag, edit, or approve AI-generated puzzles so that low-quality or misleading questions are retired and high-quality ones are promoted into the curated bank.

---

### 🔐 Instructor Login & Authentication System

Today instructors interact with the dashboard without any authentication — anyone who knows a `project_id` can view that project's data. The planned instructor login system closes this gap and unlocks a richer set of management features:

#### Authentication Flow
1. **Registration** — an instructor signs up with their institutional email address, full name, and a password. The backend hashes the password with `bcrypt`, stores the record in a persistent database (PostgreSQL replacing the current in-memory store), and sends a one-time verification link to confirm ownership of the email address.
2. **Login** — the instructor submits credentials to a new `POST /auth/login` endpoint that returns a short-lived **access token** (JWT, 15-minute TTL) and a long-lived **refresh token** (httpOnly cookie, 7-day TTL). All dashboard and project-management endpoints will require a valid access token in the `Authorization: Bearer` header.
3. **Token refresh** — the frontend silently calls `POST /auth/refresh` before the access token expires so that active sessions stay alive without forcing a re-login.
4. **Logout** — `POST /auth/logout` invalidates the refresh token server-side (stored in a token-revocation table) so that stolen cookies cannot be replayed.
5. **Password reset** — `POST /auth/forgot-password` sends a signed, time-limited reset link; `POST /auth/reset-password` accepts the token and new password.

#### Instructor-Specific Features (unlocked by login)
- **Multi-project management** — each instructor account owns a list of projects. The dashboard home page shows all their projects in one view with per-project aggregate stats (total students, average solve time, open lockouts).
- **Assignment lifecycle** — instructors can mark a project as *active*, *archived*, or *draft*. Archived projects become read-only; students whose hook still points to an archived project receive a friendly message instead of a puzzle.
- **Per-project configuration** — instructors can tune the Friction Coefficient threshold, maximum reflection period, and hint availability on a project-by-project basis without touching the global defaults.
- **Student roster management** — invite students by email (instead of broadcasting a raw join code), remove a student from a project, and view per-student solve history across all assignments.
- **Collaborator roles** — a project owner can add co-instructors or TAs with read-only or read-write access, enabling course staff to monitor dashboards and clear lockouts without sharing the owner's credentials.
- **Audit log** — every administrative action (lockout override, config change, puzzle edit) is timestamped and attributed to the authenticated instructor so there is an accountability trail.

#### Backend Changes Required
- New `instructors` table (id, email, hashed_password, verified, created_at)
- New `refresh_tokens` table for revocation tracking
- `projects` table gains an `owner_id` foreign key
- All `/dashboard/*` and `/projects/*` routes gain an `Depends(get_current_instructor)` guard
- New router: `app/routers/auth.py`

---

### 📊 More Informative Project Dashboard

The current dashboard surfaces live puzzle status, active lockouts, authenticity flags, and a concept heatmap. The planned upgrade turns it into a full learning-analytics panel:

- **Per-student solve timeline** — a sparkline showing each student's solve time trend across all their pushes in the project, making it easy to spot students who are improving vs. plateauing.
- **Commit volume vs. puzzle pass rate** — a scatter plot correlating how frequently a student pushes with how often they pass on the first attempt, surfacing students who push often but rarely understand what they're committing.
- **Concept mastery progress bars** — expanding the existing concept heatmap into per-student progress bars for each concept tag (recursion, DP, graphs…) so instructors can identify exactly which topic a student needs help with before the final exam.
- **Cohort comparison** — anonymous percentile bands showing where each student sits relative to the class for solve time and first-attempt pass rate, without exposing individual peers' identities.
- **Push activity calendar** — a GitHub-style contribution heatmap per student showing which days they pushed code, making it easy to identify last-minute cramming patterns before deadlines.
- **Exportable reports** — one-click CSV / PDF export of all dashboard data for gradebook integration or end-of-semester review.
- **Configurable alerts** — instructors subscribe to email or webhook notifications when a student exceeds a lockout threshold or when the class-wide first-attempt pass rate drops below a configured floor.
- **Real-time push notifications** — the existing SSE stream will be augmented to push browser notifications (with the user's permission) so instructors do not need to keep the dashboard tab in focus.

---

### 🔭 Additional Improvements (from Codebase Analysis)

A close reading of the codebase surfaced several areas where incremental investment would significantly improve reliability and maintainability:

- **Persistent storage** — every endpoint currently reads from and writes to Python in-memory dicts (see `inertia-backend/app/storage/`). A process restart wipes all active puzzle sessions, student enrollments, and lockout records. Migrating to PostgreSQL (via SQLAlchemy async) or at minimum completing the optional Redis path (`USE_REDIS=true`) is the single highest-leverage infrastructure improvement.
- **CLI distribution & auto-update** — `inertia update` is already defined but the PyPI package version is hard-coded. Wiring the CLI to check the PyPI JSON API on startup and prompt for an upgrade when a newer version is available would eliminate stale-hook issues.
- **Hook integrity verification** — `inertia repair` reinstalls the hook but does not verify that it hasn't been deliberately removed or bypassed. Adding a lightweight HMAC signature over the hook file and checking it on every `inertia status` call would make silent disabling detectable.
- **Frontend type safety** — several API response shapes in `inertia-frontend/src/types/` are typed as `any` or use loose `Record<string, unknown>` shapes. Replacing these with strict Zod schemas parsed at the API boundary would catch backend contract changes at runtime rather than producing silent UI bugs.
- **End-to-end test coverage** — the backend has a `pytest` suite and the frontend lints and builds in CI, but there are no integration tests that exercise the full push → puzzle → answer → JWT flow. Adding a single Playwright or Cypress smoke test against a local stack would prevent regressions in the critical path.
- **Rate limiting & abuse prevention** — the `/verify` endpoint currently relies on the reflection-period lockout to prevent brute-force answer guessing. Adding a per-`token_id` attempt counter (max 3 before expiry) and a global per-IP rate limit on `/puzzle` would close the remaining abuse vectors.

---

## License

MIT — see [LICENSE](LICENSE)

