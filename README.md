# CarbonLoop

CarbonLoop is an evidence-backed campus decarbonization platform. This repository currently contains the engineering foundation only; no CarbonLoop business workflows, Supabase schema, API endpoints, or real data processing are implemented.

## Prerequisites

- Windows 10 or 11
- Node.js 22 LTS or later — **NEEDS_VERIFICATION** for the team's final supported version
- npm 10 or later — **NEEDS_VERIFICATION** for the team's final supported version

## Windows setup

1. Open PowerShell in the repository root.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Start the development server:

   ```powershell
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). The health check is at [http://localhost:3000/health](http://localhost:3000/health).

## Checks

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:e2e
```

## Environment variables

Only non-secret public development defaults are included in `.env.example`:

- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_APP_URL`

Environment values are validated with Zod in `lib/env.ts`. Do not add real credentials, Supabase service-role keys, or personal data to example files or source control.

## Project structure

- `app/` — Next.js application shell and health page
- `modules/` — domain-module boundaries; intentionally empty in this stage
- `adapters/` — future replaceable provider adapters
- `jobs/` — future PostgreSQL-backed background work
- `supabase/` — future Supabase configuration and migrations
- `tests/` — unit and end-to-end tests
- `docs/` — project methodology and decision records

## Current scope

The internally accepted hackathon scope is campus-shuttle transport as the primary vertical slice and electricity-bill capture as the secondary flow. Real campus parameters, factors, issuers, and approval remain `NEEDS_VERIFICATION`. See `docs/decisions/ADR-0001-mvp-scope-and-pilot-boundary.md`.
