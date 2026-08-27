---
project: CarbonLoop
phase: 2
status: planned
tags:
  - carbonloop
  - phase-2
  - campus-pilot
---

# Phase 2 — Campus Pilot

## Purpose

Convert the hackathon demonstration into a controlled real-campus pilot that produces reliable operational and behavioral data without exposing individual users.

## Dependencies

- [[Phase 1 - Hackathon MVP]]
- [[CarbonLoop_Final_Project]]
- [[CarbonLoop_Architecture]]

## Pilot scope

Start with one campus and a limited number of measurable activities. Prefer one strong intervention—such as campus shuttle adoption—over a broad but weak rollout.

## Work packages

### 1. Campus configuration

- [ ] Register the university, campus, timezone, departments, and hostels.
- [ ] Assign scoped administrator roles.
- [ ] Configure campus-specific routes, evidence issuers, and approved factors.
- [ ] Define the pilot cohort, recruitment plan, and study period.
- [ ] Publish consent, privacy, and support information.

### 2. Production readiness

- [ ] Separate staging and production projects and credentials.
- [ ] Review every RLS policy and privileged server operation.
- [ ] Add malware/file checks and signed private-file access.
- [ ] Configure rate limits, idempotency, and replay protection.
- [ ] Test database backups and restoration.
- [ ] Create incident, support, and rollback procedures.

### 3. Evidence operations

- [ ] Create a review queue for ambiguous or high-value claims.
- [ ] Show evidence source, hash, tier, status, and audit history.
- [ ] Add approve, reject, and request-correction actions.
- [ ] Preserve all changes as audit/reversal events.
- [ ] Monitor duplicate bills, QR replays, and implausible quantities.

### 4. Privacy-safe aggregation

- [ ] Generate scheduled `aggregate_snapshots`.
- [ ] Enforce a configurable minimum cohort size.
- [ ] Suppress or combine groups below the threshold.
- [ ] Default campus administrators to aggregates, not raw activity.
- [ ] Separate verified, corroborated, and estimated totals.

### 5. Intervention workflow

- [ ] Let administrators define an intervention and hypothesis.
- [ ] Record eligible cohorts and measurement periods.
- [ ] Capture participation and evidence quality.
- [ ] Show observed before/after changes without premature causal claims.
- [ ] Keep intervention rules and methodology versioned.

### 6. Reporting

- [ ] Export CSV data with method and factor versions.
- [ ] Produce PDF-ready institutional summaries.
- [ ] Include emissions, participation, evidence coverage, uncertainty, and privacy notes.
- [ ] Clearly distinguish observed change from estimated causal effect.

### 7. Background jobs and retention

- [ ] Implement database-backed jobs for document extraction.
- [ ] Refresh aggregate snapshots asynchronously.
- [ ] Generate reports through an idempotent job.
- [ ] Delete or redact expired evidence on schedule.
- [ ] Move repeatedly failing jobs to a review state.

### 8. Monitoring

- [ ] Track API latency and error rate.
- [ ] Monitor authentication and authorization failures.
- [ ] Monitor job age and terminal failures.
- [ ] Measure OCR confidence and correction rates.
- [ ] Track calculation failures by factor version.
- [ ] Track QR replay and duplicate-evidence attempts.
- [ ] Monitor reward anomalies and evidence-deletion compliance.

## Pilot metrics

| Area | Example metric |
| --- | --- |
| Adoption | Invited users who complete onboarding |
| Engagement | Weekly active participants |
| Data quality | V1/V2 share of eligible activity |
| Verification | Rejection and correction rates |
| Reliability | Successful critical journeys and API error rate |
| Privacy | Number of blocked small-cohort views |
| Outcome | Observed change from baseline, with uncertainty |
| Operations | Review turnaround and support volume |

## Deliverables

- Real campus configuration
- Administrator and reviewer workflows
- Production security and recovery procedures
- Privacy-safe aggregate snapshots
- Intervention management
- Methodology-aware report export
- Monitoring and audit dashboards
- Clean pilot dataset and data-quality report

## Completion gate

- [ ] Pilot consent and retention rules have been approved.
- [ ] No administrator can access another campus or unauthorized personal records.
- [ ] Small groups are suppressed in every dashboard and export.
- [ ] Verification and reward reversals are auditable.
- [ ] Backups, restoration, monitoring, and incident procedures have been tested.
- [ ] The resulting dataset is sufficiently complete for a formal quality review.

## Risks

- **Low participation:** reduce onboarding friction and focus on one clear activity.
- **Weak evidence:** report V3 estimates separately; do not inflate verified results.
- **Privacy leakage:** raise aggregation thresholds and reduce dimensions.
- **Operational overload:** cap pilot size and document review priorities.

## Next phase

Advance to [[Phase 3 - Impact Evaluation]] only after pilot data passes the quality review.

