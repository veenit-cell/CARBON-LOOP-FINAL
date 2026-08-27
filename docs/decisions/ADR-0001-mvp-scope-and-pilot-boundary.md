# ADR-0001: MVP Scope and Pilot Boundary

- **Status:** Partially Superseded by ADR-0002
- **Date:** 2026-08-27
- **Project:** CarbonLoop
- **Hackathon MVP decision owner:** Hivemind project team
- **Pilot approval authorities:** Campus owner, methodology approver, and privacy reviewer — all **NEEDS_VERIFICATION**
- **Superseded in part by:** [ADR-0002: Android-First Game Architecture Pivot](ADR-0002-android-first-game-architecture-pivot.md)

## Context and problem

CarbonLoop is an evidence-backed campus decarbonization platform. The project notes require a deliberately narrow initial pilot so that activity evidence, deterministic CO2e calculations, privacy protections, and rewards can be demonstrated end to end without introducing unsupported categories or undocumented emission factors.

The current Phase 0 scope note lists transport, electricity, waste, and selected consumption as categories to confirm. The approved project overview defines the first pilot around campus-shuttle transport and electricity, while deferring waste and selected consumption. This ADR records separate decision levels for the hackathon and the real-campus pilot. It does not approve emission factors, evidence issuers, privacy thresholds, institutional policy, or a real campus pilot on behalf of an institution.

## Decision

> **Scope status:** The hackathon/MVP scope below is partially superseded by ADR-0002. The privacy, methodology, ownership, evidence, calculation, reward-integrity, and institutional-approval cautions in this ADR remain applicable.

### 1. Hackathon MVP scope — Accepted internally by Hivemind

- The hackathon primary vertical slice is **verified campus-shuttle transport**.
- The secondary MVP flow is **electricity-bill capture and calculation**.
- Waste and selected consumption are deferred.

This approval is an internal Hivemind project decision only. It is not institutional approval and does not authorize real-data processing.

### 2. Real campus pilot boundary — Provisional

- The proposed first-pilot boundary is **one university campus**.
- Proposed pilot participants are voluntarily enrolled students and staff.
- Proposed supported pilot categories are campus transport and electricity.
- The proposed reporting period is a two-week baseline followed by a four-week intervention period.

The pilot boundary and reporting period are provisional and pending campus, methodology, and privacy approval.

All official CO2e calculations remain deterministic and versioned. CarbonLoop must record the calculation methodology, factor version, evidence quality, and audit history for every stored calculation result. Green Reward Points are not carbon credits and must never be presented as carbon credits.

## In-scope items

1. Authenticated campus-shuttle check-ins using approved, short-lived, route-specific evidence mechanisms.
2. Server-side validation, duplicate/replay controls, evidence recording, and deterministic transport calculation for the shuttle flow.
3. Electricity-bill capture, private evidence handling, schema-validated extraction proposals, required user confirmation or correction, duplicate checks, and deterministic electricity calculation.
4. Personal access to personal activity information, calculation provenance, evidence quality, and reward history.
5. Privacy-thresholded aggregate reporting for campus administrators by default.
6. Clearly labelled sample data for seeded hackathon history and clearly labelled projections for scenario results.

## Deferred items

- Waste activities, including sorting actions and collection-data accounting.
- Selected consumption and receipt-category estimation.
- Additional activity categories, generalized receipt classification, food, procurement, and credentials.
- Direct UPI or personal banking ingestion.
- Carbon-credit, offset, or tradable-credit claims.
- Any infrastructure not required by the approved modular-monolith architecture.

Deferred categories must be displayed as unsupported or future work until their methodology, factors, evidence rules, and privacy implications have been reviewed. CarbonLoop must not invent factors to make them appear supported.

## Data ownership and attribution rules

- Users own and control access to their personal activity information, subject to approved retention, legal, and institutional-policy requirements.
- Campus administrators receive privacy-thresholded aggregate reports by default; personal activity records are not their default view.
- Each calculation must retain its activity inputs, methodology/engine version, factor version, evidence quality, and audit history so it remains traceable.
- Personal estimated reductions, intervention observations, and formal institutional greenhouse-gas inventory values are separate reporting views. They must not be automatically added together or used to claim the same reduction twice.
- Evidence records, verification outcomes, and reward events require server-side authorization. A participant cannot create their own verified evidence or reward event.
- The ownership and attribution treatment for shared electricity and other campus-supplied data is **NEEDS_VERIFICATION**.

## Reporting boundary

- **Institutional boundary:** One university campus — campus identity is **NEEDS_VERIFICATION**.
- **Participant boundary:** Voluntarily enrolled students and staff.
- **Activity boundary:** Campus-shuttle transport and electricity only.
- **Baseline and intervention:** Proposed two-week baseline followed by a four-week intervention period.
- **Status of period:** Provisional; requires campus and methodology approval before use in reporting or evaluation.
- **Administrator reporting:** Aggregated and privacy-thresholded by default; cohorts below the approved threshold must be suppressed or combined only where policy permits.
- **Claim labels:** Seeded data must be labelled **sample data**. Scenario outputs must be labelled **projections**. Calculated emissions are estimates based on their stated methodology and factor version; they are not independently verified reductions merely because an activity record is verified.

## Known unknowns

The following details are required before implementation or real-data processing and are marked **NEEDS_VERIFICATION**:

- Campus-specific shuttle routes and route-distance source.
- Approved electricity factors, sources, applicable geography, validity dates, and factor-approval owner.
- Pilot cohort size and recruitment plan.
- Minimum privacy threshold and permitted aggregate dimensions.
- Responsible campus owner for the pilot and reporting approval.
- Authorized shuttle and electricity evidence issuers.
- Final pilot start and end dates.
- Exact organizational accounting boundary, Scope classification, and shared-data attribution rules.
- Consent purposes, retention/deletion periods, derived-data handling, and export policy.
- Reward budget, caps, expiry, redemption, and reversal policy.
- Baseline eligibility rules, exclusions, normalization, and calculation fixtures.

## Acceptance criteria

### Accepted internal scope

- [x] Hivemind has approved the hackathon primary vertical slice as campus-shuttle transport.
- [x] Hivemind has approved electricity-bill capture as the secondary MVP flow.
- [x] Hivemind has deferred waste and selected consumption from the hackathon MVP.

### Pending real-campus pilot approval

The real-campus pilot boundary remains provisional until all of the following are satisfied:

- [ ] A named campus owner and methodology approver have reviewed the proposed scope.
- [ ] The pilot campus, cohort size, and privacy threshold are documented and approved.
- [ ] Shuttle routes/evidence issuers and electricity-factor sources are documented and approved.
- [ ] The reporting boundary, attribution rules, and provisional period are approved or revised with a recorded rationale.
- [ ] Consent purposes, retention/deletion behavior, and access roles are approved.
- [ ] At least one approved, versioned factor and reviewed deterministic calculation fixture exists for each supported activity.
- [ ] Evidence quality, verification states, duplicate handling, and reward eligibility are documented without conflating source quality with workflow state.
- [ ] Seeded data and scenario-label requirements are included in demo and reporting review checks.
- [ ] No deferred category is represented as supported without approved methodology and factors.

Completing the pending criteria is required before the real-campus pilot boundary can be accepted. This ADR does not complete the Phase 0 completion gate.

## Consequences and risks

### Positive consequences

- The team can build and test one credible vertical slice before expanding scope.
- The shuttle flow provides a strong evidence path for demonstrating server-side verification, deterministic calculation, and reward controls.
- The electricity flow exercises private document handling and user-confirmed extraction without treating OCR output as authoritative.
- Institutional reporting starts from privacy-safe aggregates rather than broad administrator access to personal activity data.

### Risks and mitigations

- **Provisional reporting period may be methodologically inadequate.** Do not use it for causal or institutional claims until approved; revise the period and record the rationale.
- **Missing factors or issuers could block a supported flow.** Mark that flow unsupported and retain `NEEDS_VERIFICATION`; do not invent a factor or source.
- **Small cohorts could permit re-identification.** Suppress or combine groups according to an approved threshold and restrict repeated aggregate queries.
- **Shared-data attribution could double count emissions or reductions.** Require a documented boundary and ownership rule before reporting.
- **Seeded history or scenarios could be mistaken for observations.** Apply the required sample-data and projection labels in all user-facing outputs.
- **A verified activity could be misread as a verified reduction.** Keep evidence, estimated emissions, observed change, and reward eligibility as distinct concepts.

## Approval

| Role | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Hivemind project team | Hivemind | Accepted: hackathon MVP scope only | 2026-08-27 | Not institutional approval; does not accept the real-campus pilot boundary. |
| Responsible campus owner | NEEDS_VERIFICATION | Pending | NEEDS_VERIFICATION | |
| Methodology approver | NEEDS_VERIFICATION | Pending | NEEDS_VERIFICATION | |
| Privacy/institutional-policy reviewer | NEEDS_VERIFICATION | Pending | NEEDS_VERIFICATION | |
| CarbonLoop project representative | NEEDS_VERIFICATION | Pending | NEEDS_VERIFICATION | |

The hackathon MVP scope is accepted internally by Hivemind. The real-campus pilot boundary remains provisional and must not be treated as institutionally approved until the required campus, methodology, and privacy approvers record their decisions.
