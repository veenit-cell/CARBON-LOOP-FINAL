# CarbonLoop hackathon MVP

CarbonLoop is a synthetic, browser-playable sustainability game. Every displayed number is derived from an append-only event ledger, and every value is labelled as simulated, synthetic, or mock. It is **not production-ready** and represents no real campus data.

## Prerequisites

- Node.js >= 20.9 (verified on v24.14.0) and npm >= 10 (verified on 11.9.0)
- Android Studio/JDK only for Android validation (**NEEDS_VERIFICATION**)

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000): `/` is the landing page, `/demo` is the mission board, `/dashboard` is the ledger and privacy-safe aggregate view, and `/api/v1/health` is the demo health check.

The six `@carbonloop/*` workspace packages publish compiled `dist` output, so nothing in `apps/web` resolves until they are built. `dev`, `build`, `test`, and `typecheck` each run `build:packages` first through an npm `pre` hook — you never need to build them by hand.

Production mode:

```bash
npm run build
npm run start
```

## How progress is stored

The game keeps one save per browser in `localStorage` under `carbonloop.save.v1`, so progress survives a refresh and each visitor gets an independent game with no accounts, keys, or database. **Reset this browser's save** in the footer clears it back to the deterministic seed. A loaded save is treated as untrusted input and is re-validated by the scoring rules before use; a corrupt or tampered one starts a clean game instead of breaking.

`/api/v1/*` is a separate stateless demo surface for the same rules. Its state is process-local and resets on redeploy, which every response says out loud.

## Judge flow (3–5 minutes)

1. Open `/`, then choose **Start playing**.
2. On `/demo`, note the Synthetic Data, Simulated Evidence, and Mock Reward labels, and that each mission card's reward preview is computed by the same carbon engine that scores the completion.
3. Start and complete **Walk to Campus**. The completion receipt shows the motorbike baseline, the emission factor version used for each side, avoided CO2e to three decimals, and the evidence tier — Eco XP, Green Points, and avoided CO2e are never mixed into one number.
4. Complete **Zero-Waste Lunch**. It displaces nothing motorised, so it pays Eco XP only and states that reason rather than inventing a carbon claim.
5. Complete **Green Shuttle Check-in** — a shared motorised ride, costed with the shuttle factor, not treated as zero-emission. Its synthetic token cannot be replayed.
6. Open Rewards and redeem a mock reward once affordable; no payment, delivery, cash value, carbon credit, or offset occurs. Lifetime earnings never shrink when points are spent.
7. Open `/dashboard` for the full event ledger, evidence-tier mix, and privacy-safe synthetic aggregate.
8. Use **Reset this browser's save** and repeat from the deterministic seed.

## Limits and Android status

All displayed activity, calculation inputs, evidence, rewards, and aggregate values are synthetic or simulated. No real campus data, movement/location history, payment, institutional approval, or production persistence is represented. The reset endpoint and the API's in-process state are demo-only. Android source is present; device/runtime compatibility is **NEEDS_VERIFICATION**.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` runs the 62 package tests and then the app suite (API contract, game rules, environment). The API tests call the route modules directly rather than spawning a server, so they pass in ms and do not conflict with a dev server you already have open.

## Deploying

`apps/web` builds to a traced standalone bundle (`output: "standalone"`), so a deploy needs no `npm install` step:

```bash
npm run build
node apps/web/.next/standalone/apps/web/server.js
```

Copy `apps/web/.next/static` to `apps/web/.next/standalone/apps/web/.next/static` first — static assets are not traced. `PORT` and `HOSTNAME` configure the server.

The `Dockerfile` at the repo root does the same in three stages (install from manifests, build, copy the standalone output onto a clean `node:22-alpine`) and runs as the unprivileged `node` user:

```bash
docker build -t carbonloop . && docker run --rm -p 3000:3000 carbonloop
```

The Dockerfile has not been built in this environment — no Docker daemon was available — so treat the first `docker build` as unverified.
