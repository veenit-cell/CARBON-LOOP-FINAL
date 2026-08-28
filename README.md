# CarbonLoop hackathon MVP

CarbonLoop is a synthetic, browser-playable sustainability-game demonstration. It uses deterministic demo data and is **not production-ready**.

## Prerequisites

- Node.js 22 LTS and npm 10 (team versions: **NEEDS_VERIFICATION**)
- Android Studio/JDK only for Android validation (**NEEDS_VERIFICATION**)

## Install and run

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000): `/` is the landing page, `/demo` is the player journey, `/dashboard` is the privacy-safe aggregate view, and `/api/v1/health` is the demo health check.

Production mode:

```powershell
npm run build
npm run start
```

## Judge flow (3–5 minutes)

1. Open `/`, then choose **Start Your Mission**.
2. On `/demo`, note the compact Hackathon Demo, Synthetic Data, Simulated Evidence, and Mock Reward labels.
3. Complete **Walk to Campus**, then show Eco XP, Green Points, and avoided CO2e separately in the completion view.
4. Open Rewards and redeem the mock reward; no payment, delivery, cash, carbon credit, or offset occurs.
5. Demonstrate one simulated shuttle check-in, then open `/dashboard` to see a privacy-safe synthetic aggregate.
6. Use **Reset Demo** and repeat from its deterministic seeded state.

## Limits and Android status

All displayed activity, calculation inputs, evidence, rewards, and aggregate values are synthetic or simulated. No real campus data, movement/location history, payment, institutional approval, or production persistence is represented. The process-local reset endpoint is demo-only. Android source is present; device/runtime compatibility is **NEEDS_VERIFICATION**.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```