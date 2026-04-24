# Inertia.edu Frontend

React + TypeScript + Vite frontend for the Inertia.edu hackathon project.

## Features

- Student flow: audit → puzzle → verify
- Instructor dashboard with SSE live updates and polling fallback
- Centralized API error handling for 400 / 403 / 404 / 423 / 5xx
- TailwindCSS UI and typed API layer

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
VITE_API_BASE_URL=https://inertia-production-e090.up.railway.app
```

## Development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```
