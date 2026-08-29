# 🌱 CarbonLoop

### Gamifying Everyday Climate Action

**CarbonLoop** is a gamified sustainability platform designed to turn everyday low-carbon activities into measurable progress, challenges, rewards, and community competition.

Instead of presenting carbon reduction as charts and statistics alone, CarbonLoop transforms sustainable behaviour into a game:

**Move → Complete Missions → Reduce Carbon → Earn XP → Climb the Leaderboard → Unlock Rewards**

---

## 🏆 Built for Avinya 2026 — IIT Guwahati

CarbonLoop is being developed as a hackathon MVP focused on demonstrating how behavioural gamification, deterministic carbon calculations, activity tracking, and reward systems can encourage sustainable lifestyles.

> **Current MVP Notice**
>
> The hackathon version currently uses **synthetic activity data, simulated evidence, and mock rewards**.
>
> It does **not** currently represent real campus emissions, carbon credits, financial rewards, or production Health Connect data.

---

# 🌍 The Problem

People generate carbon emissions every day through:

* Transportation
* Energy consumption
* Food choices
* Waste generation
* Lifestyle decisions

Most carbon-tracking platforms show users a number.

But knowing your carbon footprint does not necessarily change behaviour.

CarbonLoop approaches the problem differently:

> **What if reducing your carbon footprint felt like progressing through a game?**

---

# 💡 Our Solution

CarbonLoop converts verified or simulated sustainable activities into measurable game progress.

For example:

```text
Walk instead of taking a motorbike
        ↓
Activity detected / submitted
        ↓
Evidence evaluated
        ↓
Carbon engine calculates avoided CO₂e
        ↓
Mission completed
        ↓
Eco XP + Green Points awarded
        ↓
Leaderboard updated
        ↓
Rewards unlocked
```

The goal is to create a positive feedback loop:

```text
Sustainable Action
      ↓
Carbon Reduction
      ↓
Progress
      ↓
XP / Points
      ↓
Competition & Rewards
      ↓
More Sustainable Action
      ↺
```

---

# ✨ Core Features

## 🎯 Sustainability Missions

Users complete sustainability challenges such as:

* 🚶 Walk to Campus
* 🚲 Cycle instead of using motorized transport
* 🚌 Use shared/public transportation
* ♻️ Complete zero-waste challenges
* 🌱 Participate in sustainability activities
* 🏃 Complete movement-based goals
* 💡 Reduce resource consumption

Each mission can define:

```text
Activity
Evidence
Carbon calculation
XP reward
Green Point reward
Completion rules
```

---

## 🌱 Deterministic Carbon Engine

CarbonLoop does not use an LLM to calculate official carbon values.

Carbon calculations are handled using a deterministic and versioned engine.

Conceptually:

```text
Avoided CO₂e
=
Baseline Emissions
-
Actual Activity Emissions
```

This makes calculations:

* Reproducible
* Explainable
* Testable
* Versioned
* Auditable

The calculation system is separated into reusable packages so the UI does not control environmental calculations.

---

## ⚡ Eco XP

**Eco XP** represents player progression.

Users earn XP by completing missions and sustainable activities.

XP can be used for:

* Levels
* Achievement progression
* Streak systems
* Player ranking
* Future unlockable challenges

XP represents **game progression**, not carbon reduction itself.

---

## 🪙 Green Points

Green Points form CarbonLoop's reward economy.

Users earn points by completing eligible sustainability challenges.

Points can later support:

* Reward redemption
* Campus incentives
* Partner offers
* Sustainable marketplace rewards
* Event incentives

The current hackathon version uses **mock rewards only**.

---

## 🏆 Leaderboard

CarbonLoop introduces competition through leaderboards.

Possible rankings include:

```text
Daily Leaderboard
Weekly Leaderboard
Campus Leaderboard
Mission Leaderboard
Eco XP Leaderboard
Carbon Reduction Leaderboard
```

The leaderboard encourages healthy competition while making sustainability visible and engaging.

---

## 🎁 Rewards Marketplace

Players can spend earned Green Points inside the reward system.

Potential future rewards could include:

* Campus coupons
* Food discounts
* Event benefits
* Sustainable products
* Partner rewards
* Campus privileges

The MVP marketplace demonstrates the redemption flow without performing real payments, deliveries, carbon-credit transfers, or cash-value transactions.

---

# 🎮 Example User Journey

```text
1. User opens CarbonLoop

2. User views available missions

3. User starts "Walk to Campus"

4. Activity is completed

5. Evidence is evaluated

6. CarbonLoop calculates:

   Baseline transport emissions
              -
   Walking emissions
              =
   Avoided CO₂e

7. User receives:

   + Eco XP
   + Green Points
   + Carbon reduction record

8. Leaderboard position updates

9. User continues completing missions

10. Green Points can be redeemed for rewards
```

---

# 🧪 Current Hackathon Demo

The browser MVP includes several demonstration missions.

### 🚶 Walk to Campus

Compares a motorbike baseline against walking and calculates avoided CO₂e using the versioned carbon engine.

### ♻️ Zero-Waste Lunch

Rewards sustainable behaviour without inventing a transportation-related carbon claim where no displacement occurred.

### 🚌 Green Shuttle Check-In

Demonstrates how shared motorized transport can be evaluated using its own emission factor instead of incorrectly classifying it as zero-emission.

---

# 🏗️ Architecture

CarbonLoop follows a **modular monorepo architecture**.

```text
CARBON-LOOP-FINAL/
│
├── apps/
│   ├── web/
│   │   └── Next.js CarbonLoop web experience
│   │
│   └── android/
│       └── Android application foundation
│
├── packages/
│   ├── schemas/
│   ├── factor-registry/
│   ├── carbon-engine/
│   ├── quest-engine/
│   ├── scoring/
│   └── marketplace/
│
├── docs/
│   └── Architecture, ADRs and project documentation
│
├── supabase/
│   └── Backend / database foundation
│
├── tests/
│   └── Project-level tests
│
├── workers/
│   └── Background worker foundation
│
├── .github/
│   └── GitHub workflows
│
├── Dockerfile
├── playwright.config.ts
├── vitest.config.ts
├── package.json
└── README.md
```

---

# 🧩 Core Packages

## `@carbonloop/schemas`

Shared domain contracts and validation schemas.

Responsible for defining consistent structures for concepts such as:

```text
Users
Activities
Evidence
Quests
Carbon results
Rewards
Progression
Institutional aggregates
```

---

## `@carbonloop/factor-registry`

Manages versioned emission factors used by the calculation engine.

Its purpose is to prevent environmental calculations from depending on arbitrary hard-coded values spread throughout the application.

---

## `@carbonloop/carbon-engine`

The deterministic carbon calculation engine.

Responsible for calculating emissions and avoided CO₂e using defined activities, baselines, and versioned factors.

---

## `@carbonloop/quest-engine`

Handles mission and quest logic.

Responsible for determining how sustainability challenges behave and when they can be completed.

---

## `@carbonloop/scoring`

Handles progression calculations such as:

```text
Eco XP
Green Points
Mission scoring
Player progression
```

---

## `@carbonloop/marketplace`

Contains reward marketplace domain logic including reward eligibility and redemption behaviour.

---

# 🖥️ Web Application

The main web application is located at:

```text
apps/web
```

Key routes currently include:

| Route            | Purpose                                 |
| ---------------- | --------------------------------------- |
| `/`              | CarbonLoop landing page                 |
| `/demo`          | Interactive mission/game experience     |
| `/dashboard`     | Activity ledger and aggregate dashboard |
| `/api/v1/health` | Demo API health endpoint                |

---

# 📱 Android Application

CarbonLoop also contains an Android application foundation under:

```text
apps/android
```

The Android architecture is intended to support future mobile-first features such as:

* Activity tracking
* Mission management
* User progression
* Reward access
* Health Connect integration
* Sensor-assisted evidence
* Notifications

Production integrations remain subject to validation and permissions.

---

# ❤️ Health & Activity Integration Vision

A future CarbonLoop mobile implementation can integrate with platforms such as **Android Health Connect** to access permissioned activity information.

Potential signals include:

```text
Steps
Walking distance
Cycling activity
Exercise sessions
Active time
Movement-related metrics
```

The intended architecture is:

```text
Health Connect / Device Sensors
            ↓
Permission Layer
            ↓
Activity Adapter
            ↓
Evidence Validation
            ↓
Quest Engine
            ↓
Carbon Engine
            ↓
Scoring Engine
            ↓
Leaderboard / Rewards
```

Health data must only be accessed after appropriate user authorization and platform permission flows.

---

# 🗃️ Backend Vision

The architecture is designed to support **Supabase** for:

```text
PostgreSQL
Authentication
Row Level Security
Storage
Backend APIs
```

For production deployments, PostgreSQL is intended to become the authoritative system of record.

The current browser demo intentionally uses local/demo state for the hackathon experience.

---

# 🔐 Privacy Principles

CarbonLoop is designed around privacy-conscious sustainability tracking.

Core principles include:

* Explicit permission for health/activity information
* Minimum necessary data collection
* Server-side validation
* Schema validation
* Row Level Security for production data
* Separation between identity and aggregate sustainability statistics
* No automatic assumption that activity data is valid evidence
* No sale of health or personal activity information

---

# 🧠 Evidence System

Not every sustainability action should automatically generate carbon claims.

CarbonLoop therefore separates:

```text
Activity
   ↓
Evidence
   ↓
Validation
   ↓
Carbon Calculation
   ↓
Reward
```

Possible future evidence sources include:

* Health Connect
* Smartphone sensors
* GPS-derived routes
* QR check-ins
* Campus verification
* User submissions
* Institutional systems

The level of evidence required can depend on the mission.

---

# 🛠️ Tech Stack

### Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

### Mobile

```text
Android
Kotlin
Jetpack Compose
```

### Backend / Data Architecture

```text
Supabase
PostgreSQL
Row Level Security
```

### Validation & Domain Logic

```text
TypeScript
Zod-style schema validation
Versioned emission factors
Deterministic carbon engine
```

### Testing

```text
Vitest
Playwright
Type checking
Linting
```

### Infrastructure

```text
Docker
GitHub Actions
npm Workspaces
```

---

# 🚀 Getting Started

## Prerequisites

Install:

```text
Node.js >= 20.9
npm >= 10
```

Android Studio and the Android SDK are required only when working with the Android application.

---

## 1. Clone the Repository

```bash
git clone https://github.com/veenit-cell/CARBON-LOOP-FINAL.git
```

```bash
cd CARBON-LOOP-FINAL
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🏭 Production Build

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

---

# 🧪 Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Run type checking:

```bash
npm run typecheck
```

Run linting:

```bash
npm run lint
```

---

# 📦 Monorepo Build System

CarbonLoop uses npm workspaces.

The shared packages are built before the web application.

The package dependency chain includes:

```text
schemas
   ↓
factor-registry
   ↓
carbon-engine
   ↓
scoring
```

Supporting domain packages include:

```text
quest-engine
marketplace
```

Normally, developers do not need to build the packages manually because the root development and build scripts automatically build the required packages first.

Manual package build:

```bash
npm run build:packages
```

---

# 💾 Current Demo Storage

The current browser game stores progress locally in the browser.

```text
localStorage
└── carbonloop.save.v1
```

This means:

* Progress survives browser refreshes
* Each browser gets an independent game
* No account is required for the current demo
* No production database is required to demonstrate the hackathon experience

Loaded saves are treated as untrusted input and validated before being used.

The demo API uses process-local state and can reset when the application is redeployed.

---

# 🔬 Carbon Calculation Philosophy

CarbonLoop follows several important rules.

### 1. Carbon ≠ XP

Carbon avoided and game progression are separate metrics.

```text
Avoided CO₂e ≠ Eco XP ≠ Green Points
```

### 2. No invented reductions

If an activity does not have an appropriate measurable baseline, CarbonLoop should not invent a carbon reduction.

### 3. Version every emission factor

Calculations should be traceable back to the emission-factor version used.

### 4. Deterministic calculations

The same validated inputs and factor version should produce the same carbon result.

### 5. AI should not determine official carbon calculations

AI may assist future user experiences, but official numerical carbon calculations must remain deterministic and auditable.

---

# 🎯 Product Vision

CarbonLoop is ultimately designed to connect four systems:

```text
          REAL-WORLD ACTIVITY
                  │
                  ▼
          ┌───────────────┐
          │   EVIDENCE    │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │ CARBON ENGINE │
          └───────┬───────┘
                  │
          ┌───────┴────────┐
          ▼                ▼
      Eco XP         Green Points
          │                │
          ▼                ▼
       Levels          Rewards
          │
          ▼
     Leaderboards
```

This creates a system where sustainability becomes measurable, competitive, and rewarding.

---

# 🗺️ Roadmap

### Phase 1 — Hackathon MVP

* [x] Gamified sustainability concept
* [x] Mission system
* [x] Deterministic carbon calculation foundation
* [x] Emission factor registry
* [x] Eco XP scoring
* [x] Green Points
* [x] Mock rewards
* [x] Browser persistence
* [x] Interactive web demo
* [x] Shared domain packages
* [x] Android application foundation
* [ ] Production activity integrations

### Phase 2 — Connected Mobile Experience

* [ ] Android activity tracking
* [ ] Health Connect integration
* [ ] Authentication
* [ ] Real database persistence
* [ ] Evidence validation
* [ ] Real-time leaderboard
* [ ] Mission recommendation system
* [ ] Notifications

### Phase 3 — Campus Pilot

* [ ] Verified campus emission factors
* [ ] Campus sustainability missions
* [ ] QR-based campus evidence
* [ ] Institutional dashboard
* [ ] Privacy-safe cohort analytics
* [ ] Campus reward partners

### Phase 4 — Multi-Campus Platform

* [ ] Multi-campus support
* [ ] Inter-campus challenges
* [ ] Sustainability competitions
* [ ] Partner marketplace
* [ ] Advanced analytics
* [ ] Institutional carbon insights

---

# 🌟 What Makes CarbonLoop Different?

Traditional carbon calculators tell users:

> "You generated X kg of CO₂."

CarbonLoop asks:

> **"What can you do next to reduce it?"**

And then turns that action into:

```text
A Mission
+
Verified Progress
+
Carbon Impact
+
XP
+
Competition
+
Rewards
```

CarbonLoop combines:

**Carbon Accounting × Behavioural Gamification × Activity Tracking × Rewards × Community Competition**

into a single sustainability experience.

---

# ⚠️ MVP Limitations

The current hackathon implementation is a demonstration system.

Unless explicitly marked otherwise:

* Activity data is synthetic
* Evidence is simulated
* Rewards are mock rewards
* Campus data is not authoritative
* Carbon values must not be interpreted as verified institutional emissions
* No real carbon credits or offsets are generated
* No monetary value is assigned to Green Points
* Production Health Connect integration is not yet active
* Production campus integrations require institutional approval

These limitations are intentional so the demo does not misrepresent simulated data as real-world environmental evidence.

---

# 📚 Documentation

Additional technical and project documentation is available throughout the repository, including:

```text
CarbonLoop_Final_Project.md
CarbonLoop_Architecture.md
CarbonLoop_Codex_Build_Playbook.md
CarbonLoop - Phase Roadmap.md
CarbonLoop - Project Tracker.md

Phase 0 - Methodology and Setup.md
Phase 1 - Hackathon MVP.md
Phase 2 - Campus Pilot.md
Phase 3 - Impact Evaluation.md
Phase 4 - Multi-campus Scale.md
```

Additional architecture decision records and technical documentation are available inside:

```text
docs/
```

---

# 🤝 Contributing

Contributions, ideas, testing feedback, and sustainability research suggestions are welcome.

Typical workflow:

```bash
git checkout -b feature/your-feature
```

Make and test your changes:

```bash
npm run typecheck
npm test
npm run lint
```

Commit:

```bash
git commit -m "feat: describe your change"
```

Push:

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 👥 Team

### Team Hivemind

Built for the **Avinya 2026 Hackathon at IIT Guwahati**.

Focused on combining software engineering, behavioural design, environmental accounting, and gamification to make sustainable action easier to understand and more rewarding.

---

# 🔮 Future Vision

Imagine a campus where students open CarbonLoop every morning and see:

```text
🎯 Daily Missions
🚶 Sustainable movement goals
🔥 Sustainability streak
🌱 CO₂e avoided
⚡ Eco XP
🪙 Green Points
🏆 Campus ranking
🎁 Unlockable rewards
```

Thousands of individual sustainable decisions can then become measurable collective action.

That is the loop CarbonLoop aims to create.

---

<div align="center">

## 🌱 CarbonLoop

### Play greener. Live smarter. Reduce together.

**Built by Team Hivemind**

</div>
