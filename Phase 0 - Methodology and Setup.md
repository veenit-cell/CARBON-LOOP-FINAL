---
project: CarbonLoop
phase: 0
status: in progress
tags:
  - carbonloop
  - phase-0
  - methodology
---

# Phase 0 — Methodology and Setup

## Purpose

Create the trustworthy methodological and technical foundation before building features. CarbonLoop must never calculate emissions from undocumented factors or treat every user claim as verified.

## Inputs

- [[CarbonLoop_Final_Project]]
- [[CarbonLoop_Architecture]]
- [[CarbonLoop - Phase Roadmap]]
- [ADR-0001: MVP Scope and Pilot Boundary](docs/decisions/ADR-0001-mvp-scope-and-pilot-boundary.md) — hackathon scope accepted internally; pilot boundary remains provisional.

## Main objectives

1. Define the measurable MVP categories.
2. Establish India-localized and versioned emission factors.
3. Define evidence tiers and reward eligibility.
4. Define consent, privacy, and campus success metrics.
5. Prepare the repository, environments, database plan, and test fixtures.

## Work packages

### 1. Confirm the MVP scope

- [x] Hivemind hackathon MVP scope decision: campus-shuttle transport primary vertical slice; electricity-bill capture secondary flow; waste and selected consumption deferred. The real campus pilot boundary remains provisional.
- [ ] Transport: commute mode, distance, occupancy, and campus-shuttle use.
- [ ] Electricity: household/hostel bills and selected campus-meter data.
- [ ] Waste: verified sorting actions and aggregate collection data.
- [ ] Selected consumption: limited receipt categories with explicit estimation labels.
- [ ] Mark unsupported categories as future work instead of inventing factors.

### 2. Create the emission-factor registry

For every factor, record:

- [ ] Category and activity type
- [ ] Value and unit
- [ ] Source and publication date
- [ ] Version and effective dates
- [ ] Geography and applicability
- [ ] Uncertainty or quality label
- [ ] Status: draft, approved, retired

Factor priority:

1. Institution- or supplier-specific measured data
2. India-specific activity factor
3. Regional or sector-specific secondary factor
4. Clearly labelled international fallback
5. Spend-based estimate only when activity data is unavailable

### 3. Define the evidence model

| Tier | Meaning | Example | Reward treatment |
| --- | --- | --- | --- |
| V1 | Verified | Campus shuttle QR or meter record | Full eligibility |
| V2 | Corroborated | Confirmed bill or receipt | Conditional eligibility |
| V3 | Estimated | Plausible manual entry | Insights; limited/no redeemable points |
| V4 | Rejected | Duplicate or manipulated evidence | Ineligible |

- [ ] Define evidence state transitions.
- [ ] Define duplicate detection through hashes and source identifiers.
- [ ] Define manual-review conditions.
- [ ] Define append-only reversal behavior.

### 4. Define calculation rules

```text
CO2e = activity quantity × applicable emission factor
```

- [ ] Choose canonical units for each category.
- [ ] Define rounding behavior.
- [ ] Store the factor snapshot and engine version with every result.
- [ ] Create known-input calculation fixtures.
- [ ] Prevent silent replacement of historical factors.

### 5. Define privacy and consent

- [ ] List each data purpose and required consent.
- [ ] Define withdrawal and evidence-retention behavior.
- [ ] Set the minimum cohort size for institutional reporting.
- [ ] Separate identity from analytical identifiers where possible.
- [ ] Make individual leaderboards opt-in only.
- [ ] Exclude direct UPI ingestion from the MVP.

### 6. Prepare engineering foundations

- [ ] Create the Next.js + TypeScript repository.
- [ ] Configure Tailwind CSS, shadcn/ui, ESLint, and formatting.
- [ ] Create separate local, preview, staging, and production configurations.
- [ ] Create the Supabase project and migration structure.
- [ ] Configure Vitest and Playwright.
- [ ] Prepare synthetic seed data only.
- [ ] Document secrets and environment-variable handling.

## Deliverables

- Approved MVP scope document
- Data dictionary
- Versioned emission-factor registry draft
- Calculation-methodology document
- Calculation test fixtures
- Evidence and reward rules
- Consent-purpose and retention matrix
- Pilot success metrics
- Working repository and environment setup

## Completion gate

- [ ] At least one approved factor exists for each supported MVP activity.
- [ ] Every formula has a reviewed fixture and expected result.
- [ ] V1–V4 evidence rules are unambiguous.
- [ ] Reward eligibility is linked to evidence and sustained reduction.
- [ ] Privacy threshold and consent purposes are documented.
- [ ] The development environment runs successfully for all three team members.

## Risks

- **Unreliable factor:** show the category as unsupported until reviewed.
- **Unclear evidence source:** assign V3 rather than claiming verification.
- **Scope expansion:** keep postponed features out of Phase 1.
- **Methodology disagreement:** record the decision, source, reviewer, and version.

## Next phase

Proceed to [[Phase 1 - Hackathon MVP]] only after the completion gate passes.
