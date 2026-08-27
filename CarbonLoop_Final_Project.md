# CarbonLoop

## Evidence-Backed Campus Decarbonization Platform

**Tagline:** Measure. Verify. Reduce.  
**Team:** Hivemind  
**Initial users:** Students, faculty, staff, and campus sustainability teams  
**Initial market:** Indian universities  
**Recommended first pilot:** One campus, one cohort, and two measurable activity types

---

## 1. Executive Overview

CarbonLoop is a multi-tenant campus decarbonization platform that helps people understand and reduce emissions while giving universities evidence-backed, privacy-safe information for sustainability decisions.

The platform creates a continuous operational loop:

```text
Measure -> Explain -> Simulate -> Act -> Verify -> Reward -> Evaluate -> Improve
```

Students and staff record selected activities, see how their emissions were calculated, explore practical alternatives, and receive rewards only when defined eligibility and evidence rules are satisfied. Institutional users see aggregated trends, evidence coverage, intervention results, and methodology-aware reports without receiving unrestricted access to personal activity.

CarbonLoop is not a carbon-credit marketplace, a generic carbon calculator, or a system that claims every logged action is verified. Its central value is connecting personal action to institutional decisions through reproducible calculations, graded evidence, and transparent limits.

### One-sentence pitch

> CarbonLoop helps universities measure campus emissions, verify selected sustainability actions, evaluate interventions, and produce privacy-safe reports using transparent India-specific methodology.

---

## 2. Problem

Universities generate emissions through electricity, commuting, waste, food, procurement, buildings, and other operations. However, the available data is usually fragmented, inconsistent, manually collected, or too weak to support decisions.

Personal carbon tools also tend to stop at awareness. They may provide a footprint estimate, tips, or points, but often fail to show:

- where the calculation came from;
- how reliable the underlying activity record is;
- whether a claimed action actually occurred;
- whether an improvement continued over time;
- whether a campus intervention contributed to the observed change; and
- whether reports protect individuals and state their uncertainty.

As a result, university administrators struggle to decide which programs deserve funding and users struggle to trust the results.

---

## 3. Product Goals

CarbonLoop should:

1. Produce reproducible emissions estimates with factor provenance.
2. Clearly distinguish measured, verified, corroborated, estimated, projected, and rejected information.
3. Reduce the effort required to capture activities.
4. Recommend feasible actions using explainable rules.
5. Reward sustained, eligible improvement without presenting points as carbon credits.
6. Give institutions privacy-safe evidence for planning and reporting.
7. Evaluate interventions cautiously and communicate uncertainty.
8. Enforce organizational isolation at both application and database levels.

### Non-goals for the MVP

- Tradable carbon credits or offsets
- City-wide emissions accounting
- Direct ingestion of personal banking or UPI transactions
- Fully automated causal claims
- Blockchain or a public distributed ledger
- Live marginal grid-intensity claims without a dependable source
- Complex microservices or multiple specialized databases

---

## 4. Users and Value

### Individual users

Students, faculty, staff, and hostel residents can:

- establish a category-specific baseline;
- record supported activities using low-friction capture;
- see emissions by category and evidence quality;
- compare alternative actions in a scenario simulator;
- receive transparent recommendations; and
- review consent, evidence, calculations, and reward history.

### Institutional users

Authorized sustainability and operations personnel can:

- monitor privacy-safe aggregate trends;
- inspect data quality and evidence coverage;
- configure bounded interventions;
- compare observed outcomes with baselines;
- export methodology-aware reports; and
- identify operational opportunities requiring further investigation.

### Buyer and commercial model

The recommended model is B2B2C. A university licenses the service while eligible campus members use it without charge. Setup, approved integrations, and specialized methodology support may be separate services. Rewards should be funded by the institution or sponsors under explicit budgets.

---

## 5. MVP Scope

The first pilot should be intentionally narrow.

### Included

1. **Campus shuttle transport**
   - Rotating or short-lived QR capture
   - Route and journey validation
   - Duplicate and replay detection
   - Versioned passenger-distance calculation

2. **Electricity consumption**
   - Bill upload
   - OCR-assisted extraction
   - Mandatory user confirmation
   - Applicable versioned grid factor

3. **Shared capabilities**
   - Authentication, membership, roles, and consent
   - Factor registry and deterministic calculation engine
   - Evidence states and review workflow
   - Personal dashboard and simulator
   - Append-only reward events
   - Privacy-safe institutional dashboard
   - Audit events and report export

### Deferred

Waste, food, procurement, generalized receipt classification, credentials, advanced causal inference, and additional infrastructure should follow only after the first two use cases work reliably.

---

## 6. Measurement and Carbon Accounting

CarbonLoop estimates emissions using activity data and an applicable factor:

```text
CO2e = activity quantity x emission factor
```

Examples:

```text
Transport = passenger-km x kg CO2e/passenger-km
Electricity = kWh x kg CO2e/kWh
```

Every stored calculation must include:

- activity quantity and unit;
- emission factor value and unit;
- source, version, geography, and validity period;
- factor quality and fallback status;
- calculation-engine version;
- evidence state;
- result and uncertainty or quality label; and
- calculation timestamp.

Past calculations must remain reproducible after a factor changes. A recalculation should create a new version or result rather than silently rewriting history.

### Accounting boundary

Before the pilot begins, the university must define:

- included campuses and cohorts;
- included activities and reporting period;
- whether results represent personal activity, an intervention inventory, or an institutional inventory;
- ownership and treatment of shared electricity or travel data;
- applicable Scope 1, Scope 2, or Scope 3 classification; and
- rules preventing duplicate attribution.

Personal avoided-emission estimates must not automatically be added to a formal institutional greenhouse-gas inventory. The two views may use related activity data but require separate boundaries, consolidation rules, and reporting labels.

### Baselines

Each baseline must specify its category, subject, reference period, minimum data requirement, exclusions, and normalization method. CarbonLoop should show observed change against a baseline before claiming an intervention effect. Weather, holidays, academic calendars, occupancy, and service changes should be considered when relevant.

---

## 7. Evidence and Verification

Evidence quality and verification status should be separate concepts. A high-quality source can still fail validation, while a valid self-report may still carry limited evidentiary strength.

### Evidence quality

| Code | Quality | Examples |
| --- | --- | --- |
| E1 | Strong source | Authorized meter, campus transport system, approved vendor record |
| E2 | Supporting document | Valid bill or receipt confirmed by the user |
| E3 | Self-reported | Plausible manual entry without independent support |

### Verification status

```text
pending -> accepted
        -> rejected
accepted -> reversed
```

Each transition records the rule or reviewer, timestamp, reason, and preceding state. Evidence records retain ownership, provenance, a content fingerprint, retention status, and any validation metadata.

### Threat controls

The verification design should explicitly cover:

- copied or shared QR codes;
- replayed submissions;
- duplicate bills or receipts;
- edited images and implausible values;
- collusion between users;
- clock, route, and location inconsistencies;
- privileged reviewer abuse; and
- repeated submissions across organizations.

Automated checks should flag suspicious claims; ambiguous claims should enter a review queue. Rejection and reversal must never erase the historical record.

---

## 8. Rewards

CarbonLoop issues Green Reward Points, not carbon credits.

Reward eligibility is a server-side policy based on evidence, calculation, baseline, caps, and sustained improvement. Reward events are append-only and include the policy version that produced the decision. Corrections use compensating events.

The reward system must:

- cap repeatable actions;
- resist duplicate and replay attacks;
- show absolute footprint alongside points;
- prevent a small rewarded action from hiding a larger increase;
- support expiry and sponsor budget limits when required; and
- keep reward liability and redemption reconciliation auditable.

---

## 9. Recommended Architecture

The MVP should be a modular monolith with PostgreSQL as its system of record.

```text
Next.js PWA
    |
    v
Server-side application boundary
    |-- Identity and consent
    |-- Activities and evidence
    |-- Factor registry and calculation
    |-- Baselines and scenarios
    |-- Verification and review
    |-- Rewards
    |-- Institutional reporting
    |-- Audit
    |
    +--> PostgreSQL
    +--> Private object storage
    +--> OCR adapter
    +--> Background job runner, only where needed
```

### Architectural principles

- Keep one deployable application until operational evidence justifies separation.
- Make calculation, verification, reward, reporting, and authorization modules explicit.
- Keep business decisions on trusted server paths.
- Treat OCR output as untrusted input requiring validation and confirmation.
- Use provider adapters for replaceable external services.
- Use asynchronous work for slow uploads, extraction, exports, and aggregation.
- Make jobs idempotent and observable.
- Never expose privileged database credentials to the browser.

### Suggested repository structure

```text
carbonloop/
|-- app/                    # Next.js routes and UI
|-- modules/
|   |-- identity/
|   |-- consent/
|   |-- activities/
|   |-- evidence/
|   |-- factors/
|   |-- calculations/
|   |-- baselines/
|   |-- scenarios/
|   |-- interventions/
|   |-- rewards/
|   |-- reporting/
|   `-- audit/
|-- database/
|   |-- migrations/
|   |-- policies/
|   `-- seeds/
|-- jobs/
|-- tests/
|-- docs/
`-- infrastructure/
```

---

## 10. Multi-Tenancy, Authorization, and Privacy

Authentication establishes identity. Authorization determines what that identity may do within a specific organization and campus.

### Initial roles

| Role | Typical access |
| --- | --- |
| Participant | Own activities, evidence, consent, calculations, and rewards |
| Evidence reviewer | Assigned evidence review without unnecessary identity data |
| Sustainability analyst | Approved aggregates, interventions, and reports |
| Organization admin | Memberships, campus configuration, and scoped policies |
| Auditor | Read-only access to approved audit and methodology information |

Permissions should be explicit, organization-scoped, and checked on the server. Frontend visibility is a usability feature, not a security boundary.

### Tenant isolation

Every tenant-owned row must carry an organization identifier directly or inherit it through a protected parent. Each request should establish organization context before repository access. PostgreSQL Row-Level Security policies and automated negative tests must verify that users cannot read or mutate another tenant's records.

Service-role operations must be narrow, audited, and unavailable through arbitrary client-controlled queries.

### Privacy

- Record purpose-specific consent as versioned events.
- Define withdrawal, deletion, legal-retention, and derived-data handling.
- Store original evidence only for the minimum justified period.
- Separate identity from analytical projections where practical.
- Suppress or merge small cohorts using a configurable threshold.
- Treat repeated aggregate queries as a possible re-identification channel.
- Define who may export data and log every export.
- Complete a privacy and institutional-policy review before processing real pilot data.

---

## 11. Core Data Model

Core entities include:

```text
Organization -> Campus -> Membership
Organization -> Activity -> Evidence -> Verification decision
Activity -> Calculation -> Factor version
User/cohort -> Baseline
Intervention -> Cohort assignment -> Observation -> Evaluation
Eligible reduction -> Reward event -> Redemption event
Sensitive action -> Audit event
```

Important additions to the original table list are:

- role and permission definitions;
- verification decisions and state transitions;
- factor source releases and approval status;
- calculation versions and supersession links;
- intervention cohort assignments and exposure records;
- report definitions and generated report versions;
- reward policies, budgets, and redemptions;
- data-retention jobs and deletion records; and
- idempotency keys and processing-job state.

Identifiers, timestamps, units, currencies, time zones, and organization ownership should have consistent conventions across all entities.

---

## 12. Main User Journeys

### Verified shuttle journey

1. An authorized transport system creates a short-lived route-specific token.
2. A participant submits the token while authenticated.
3. The server checks signature, validity window, route, nonce, membership, and duplicates.
4. CarbonLoop creates an activity and evidence record.
5. The calculation engine selects an approved factor version.
6. The baseline and reward engines evaluate the result using versioned policies.
7. Personal and eligible aggregate projections update.

### Electricity bill

1. The user gives purpose-specific consent and uploads a supported file.
2. The service scans and stores it privately.
3. OCR extracts structured fields asynchronously.
4. The user confirms or corrects the fields.
5. Server validation checks dates, units, duplicates, and plausibility.
6. The calculation engine creates a reproducible result.
7. The original file is deleted or retained according to policy.

### Institutional intervention

1. An analyst defines the objective, cohort, dates, baseline, and success measure.
2. Eligible participants and exposure are recorded.
3. CarbonLoop tracks activity, evidence coverage, and data completeness.
4. The dashboard first reports descriptive observed change.
5. A reviewed evaluation method may estimate effect only when the design and data support it.

---

## 13. Reporting and Claims

Every dashboard and export should label values using a shared claim vocabulary:

| Label | Meaning |
| --- | --- |
| Measured activity | Quantity originates from an approved measurement source |
| Verified activity | The activity passed defined validation rules |
| Estimated emissions | CO2e calculated from activity data and a factor |
| Projected reduction | Scenario result about a possible future change |
| Observed change | Difference from a defined baseline without causal attribution |
| Estimated intervention effect | Model-based causal estimate with assumptions and uncertainty |

Reports must display the boundary, reporting period, factor versions, calculation version, evidence coverage, exclusions, uncertainty, and whether data is measured or estimated.

---

## 14. Reliability and Observability

The application should use structured logs, request and job identifiers, error monitoring, health checks, and basic performance metrics.

Critical operational measures include:

- activity-ingestion success and duplicate rate;
- extraction latency and correction rate;
- calculation failures and factor-selection fallbacks;
- verification queue age;
- reward issuance and reversal errors;
- authorization and RLS denials;
- report-generation failures; and
- backup restoration results.

External service failure must not corrupt the canonical activity record. OCR or recommendation failures should degrade to manual entry or transparent unavailability.

---

## 15. Implementation Roadmap

### Phase 0 — Methodology and pilot contract

- Select one campus, one cohort, shuttle travel, and electricity.
- Define boundaries, baselines, evidence rules, retention, and claims language.
- Obtain institutional approval and establish data ownership.
- Approve initial factor sources and golden calculation test cases.
- Write the threat model and role-permission matrix.

### Phase 1 — Technical foundation

- Authentication, membership, roles, and tenant context
- Database migrations and RLS policies
- Consent events and retention metadata
- Factor registry and deterministic calculation module
- Audit and idempotency foundations
- Automated tenant-isolation and calculation tests

### Phase 2 — One complete vertical slice

- Shuttle token issuance and verification
- Transport activity and calculation
- Baseline comparison
- Personal result and institutional aggregate
- Reward eligibility and append-only event
- End-to-end tests and demo data labels

### Phase 3 — Electricity and pilot operations

- Secure bill upload and asynchronous extraction
- User correction and duplicate detection
- Evidence review queue
- Privacy-safe dashboard and report export
- Monitoring, backup restoration, and incident runbook

### Phase 4 — Evaluation and expansion

- Pilot usability and data-quality evaluation
- Descriptive intervention outcomes
- Reviewed causal evaluation only if feasible
- New activity categories and integrations based on demonstrated value

---

## 16. MVP Definition of Done

The MVP is complete when:

- the pilot boundary and methodology are documented;
- one organization can be configured without code changes;
- cross-tenant access tests fail safely for every protected entity;
- shuttle and electricity calculations are reproducible from stored inputs;
- factor provenance and evidence state are visible to users;
- QR replay and duplicate evidence are rejected or reviewed;
- OCR values require confirmation and retain correction history;
- rewards use versioned server-side rules and compensating events;
- small cohorts are suppressed in institutional views;
- reports distinguish estimates, projections, observations, and effects;
- deletion and retention behavior is tested;
- backup restoration has been exercised; and
- the two primary journeys pass automated end-to-end tests.

---

## 17. Identified Flaws and Recommended Corrections

| Priority | Flaw or ambiguity | Why it matters | Correction in this overview |
| --- | --- | --- | --- |
| Critical | No explicit organizational accounting boundary | Personal reductions, intervention results, and institutional inventories could be mixed or double counted | Added boundary, ownership, Scope classification, and attribution rules |
| Critical | “Verified reduction” is used too broadly | Valid evidence proves an activity record under defined rules, not necessarily avoided emissions or causation | Added a controlled claim vocabulary separating activity, estimate, observed change, and effect |
| Critical | RLS is presented as the authorization architecture by itself | RLS cannot replace role design, server authorization, safe service credentials, or negative tests | Added roles, permissions, tenant context, server checks, and cross-tenant tests |
| High | Evidence tier combines source strength with workflow outcome | “Verified,” “corroborated,” and “rejected” are not one clean dimension | Split evidence quality from verification state |
| High | Verification lacks a concrete adversarial model | QR sharing, replay, duplicate documents, reviewer abuse, and collusion could produce rewards | Added explicit threats and controls |
| High | Baselines are under-specified | Reductions can change materially with reference period, missing data, holidays, weather, and cohort selection | Added required baseline metadata and confounders |
| High | Intervention records do not include exposure or cohort assignment | Participation cannot be separated from eligibility, making evaluation unreliable | Added assignment, exposure, observation, and evaluation entities |
| High | The MVP is oversized for a three-person team in 4–6 weeks | Auth, RLS, OCR, two dashboards, simulation, rewards, reporting, and multiple categories create delivery risk | Reduced the first slice to shuttle, then electricity, with staged foundations |
| High | Privacy controls do not define derived-data deletion | Removing an uploaded bill may leave extracted fields, calculations, aggregates, and backups unexplained | Added purpose, retention, derived-data, deletion, and export requirements |
| High | Append-only events imply more integrity than they guarantee | Database administrators or compromised privileged code may still alter rows | Treat append-only as an application and privilege control; add stronger tamper evidence only when independently verifiable |
| Medium | Reward economics are incomplete | Points create liabilities, expiry, sponsor budgets, redemption, and reconciliation needs | Added reward policies, budgets, expiry, and redemption records |
| Medium | No factor governance workflow is defined | A source can be versioned yet still be wrong, obsolete, or unapproved | Added source releases, approval status, effective periods, and golden tests |
| Medium | Asynchronous workloads are mentioned but not designed | OCR, exports, and aggregation need retry, job state, idempotency, and failure visibility | Added a bounded job model and operational metrics |
| Medium | Audit requirements lack canonical event design and verification | “Append-only audit” alone does not demonstrate integrity or completeness | Added explicit audit ownership now and deferred portable cryptographic proofs until a real external-verification need exists |
| Medium | Multi-campus hierarchy is ambiguous | Organization and campus identifiers can conflict and make policy inheritance unclear | Defined organization as tenant and campus as a scoped child |
| Medium | Success gates are proposed without pilot assumptions | Fixed percentages can appear authoritative before sample size and operating context are known | Treat them as hypotheses to approve in the pilot contract |
| Low | “AI” can dominate the story despite a deterministic core | OCR and recommendations may be mistaken for authoritative carbon reasoning | Positioned AI as an assistive adapter; calculations and policies remain deterministic |
| Low | Expansion path is premature | Corporate, residential, and city markets have different data, buyers, privacy, and accounting boundaries | Expansion now follows validated campus demand and measured bottlenecks |

---

## 18. Remaining Decisions Before Implementation

The following decisions require agreement with the pilot institution:

1. Exact organizational and reporting boundary
2. Pilot cohort, sample expectations, and reporting period
3. Initial emission-factor sources and approval owner
4. Shuttle token issuer and route data source
5. Baseline rules for transport and electricity
6. Evidence retention and deletion periods
7. Minimum aggregate cohort size
8. Reviewer, analyst, administrator, and auditor permissions
9. Reward budget, caps, expiry, and redemption policy
10. Claims allowed in dashboards, demonstrations, and reports

---

## 19. Final Positioning

> CarbonLoop is an evidence-backed campus decarbonization platform that uses transparent, versioned methodology to measure selected activities, verify supporting evidence, evaluate interventions, and produce privacy-safe institutional insight.

Its credibility should come from reproducibility, honest claim labels, strong isolation, evidence-aware workflows, and a narrow pilot that works end to end.
