# Inertia.edu

**Inertia.edu intercepts the `git push` — the exact moment a student tries to ship code without thinking — and blocks it until they solve a puzzle generated from their own diff.** We built this because we believe cognitive friction at the point of commitment is the missing mechanism in CS education: without the resistance of having to trace, explain, and own your code, knowledge is never consolidated into long-term memory. Friction isn't the enemy of learning; it *is* the learning.

## How it works

1. A student runs `inertia init` in their repo, which installs a `pre-push` git hook.
2. On every `git push`, the hook sends the diff to the Inertia backend, which computes a **Friction Coefficient** (`Fc = L + 2R + N` — lines changed, recursive calls, nesting depth).
3. If the commit is non-trivial, the push is blocked and the student is shown a browser URL.
4. The student must solve an AI-generated **Proof-of-Thought** puzzle about their own code — variable traces, breakpoint predictions — within a time limit.
5. Only after verification does the push proceed. Failed attempts trigger a *reflection period* (lockout), not a retry loop.

## Repository layout

| Directory | Contents |
|---|---|
| `inertia-backend/` | FastAPI service — audit, puzzle generation (Gemini + fallback bank), verify, dashboard, JWT |
| `inertia-frontend/` | React + TypeScript + Vite — student puzzle page, instructor dashboard |
| `inertia-cli/` | Single-file Python CLI (`inertia.py`) and pre-push hook script |
| `install.sh` | One-liner bootstrap for the CLI |

## Quick start

See [`inertia-backend/README.md`](inertia-backend/README.md) to run the API and [`inertia-frontend/README.md`](inertia-frontend/README.md) for the web app. Students install the hook with:

```bash
curl -fsSL https://inertia-production-e090.up.railway.app/install | bash
inertia init
```

---

> *"The resistance of the air is what allows the wing to lift. The friction of the code is what allows the mind to grow."*
> — Inertia.edu
