---
project: CarbonLoop
phase: 4
status: planned
tags:
  - carbonloop
  - phase-4
  - scaling
---

# Phase 4 — Multi-campus Scale

## Purpose

Expand CarbonLoop from one controlled campus into a repeatable B2B2C platform for multiple universities while preserving tenant isolation, methodological consistency, privacy, and operational reliability.

## Dependencies

- [[Phase 3 - Impact Evaluation]]
- [[Phase 2 - Campus Pilot]]
- [[CarbonLoop_Architecture]]

## Scale principles

- Automate repeated onboarding work before adding infrastructure.
- Preserve PostgreSQL as the system of record until measurements show a bottleneck.
- Keep institutional configurations and factor applicability versioned.
- Add services only for demonstrated independent scaling, ownership, or failure-isolation needs.
- Expand from university to corporate, residential, and urban communities only after the university model is repeatable.

## Work packages

### 1. Repeatable tenant onboarding

- [ ] Create a guided organization and campus setup workflow.
- [ ] Configure regions, timezones, privacy thresholds, categories, and roles.
- [ ] Provide factor applicability and methodology review tools.
- [ ] Create administrator training and support materials.
- [ ] Add institution-specific branding and report settings without code forks.

### 2. Multi-tenant governance

- [ ] Automate RLS tests for every tenant-owned table.
- [ ] Add privileged-access approval and audit workflows.
- [ ] Define institution-level data retention and deletion policies.
- [ ] Add data-export and offboarding procedures.
- [ ] Test cross-campus aggregation only where consent and contracts permit it.

### 3. Commercial operations

- [ ] Define annual institutional subscription tiers.
- [ ] Price setup, integrations, methodology support, and advanced reporting separately.
- [ ] Keep student and staff access free.
- [ ] Fund rewards through institutions or sponsors, not the core operating budget.
- [ ] Track onboarding effort, support cost, retention, and demonstrated impact.

### 4. Partner evidence

- [ ] Identify real independent issuers such as transport or facilities offices.
- [ ] Add W3C Verifiable Credentials only when portable signed claims are required.
- [ ] Document issuer trust, revocation, and verification rules.
- [ ] Add a Merkle transparency log only if external auditors require inclusion proofs.

### 5. Performance and reliability

- [ ] Define latency, availability, recovery, and cost targets.
- [ ] Load-test APIs, dashboards, jobs, and exports.
- [ ] Improve indexes, aggregate snapshots, caching, and query design first.
- [ ] Add failure isolation only for measured hot spots.
- [ ] Expand monitoring, alerting, runbooks, backups, and disaster recovery.

### 6. Add infrastructure only on triggers

| Current design | Possible addition | Required trigger |
| --- | --- | --- |
| PostgreSQL reporting | ClickHouse | Indexed and aggregated queries still exceed agreed latency/cost targets |
| PostgreSQL jobs | Temporal | Long-running, multi-step workflows require complex recovery/compensation |
| Rules and metadata | pgvector or Qdrant | Catalogue scale makes semantic retrieval measurably beneficial |
| TypeScript app | Python/FastAPI service | Approved causal methods require Python libraries in production |
| Signed events | W3C Verifiable Credentials | Independent issuers require portable claims |
| Audit events | Merkle transparency log | External auditors require portable inclusion proofs |
| Modular monolith | Extracted service | Production measurements show independent scaling or failure-isolation need |

### 7. Product expansion

- [ ] Validate repeatability across multiple Indian universities first.
- [ ] Localize factors and policy settings for each new geography.
- [ ] Expand to corporate campuses only with a defined buyer and data model.
- [ ] Consider residential and urban communities only after operational learning.
- [ ] Avoid city-wide rollout before institutional onboarding and support are stable.

## Target operating dashboard

- Number of active institutions and campuses
- Onboarding time and support effort
- Active users and evidence-quality coverage
- Verified reductions and intervention outcomes
- Privacy or security incidents
- API latency, job delay, and report-generation reliability
- Institution renewal and sponsor-funded reward utilization
- Infrastructure cost per active campus

## Deliverables

- Automated campus onboarding
- Configurable multi-tenant administration
- Institutional subscription and support model
- Scalable factor and methodology governance
- Partner-issued evidence framework where required
- Performance and capacity plan based on measurements
- Disaster-recovery and operational runbooks
- Multi-campus reporting with privacy protections

## Completion gate

- [ ] A new campus can be onboarded without a code fork.
- [ ] Tenant-isolation and privacy tests pass automatically.
- [ ] Methodology and factors remain traceable across institutions.
- [ ] Service targets and recovery procedures are tested.
- [ ] Infrastructure additions have documented measurement-based triggers.
- [ ] At least two campuses demonstrate repeatable institutional value.
- [ ] The commercial model covers delivery and operational costs.

## Explicit exclusions until justified

- Neo4j
- InfluxDB
- Redis as a default dependency
- Qdrant before semantic retrieval is needed
- Blockchain
- Federated learning
- Direct UPI ingestion
- Unsupported live marginal-grid claims
- Tradable carbon-credit claims

## Connected notes

- [[CarbonLoop - Phase Roadmap]]
- [[Phase 0 - Methodology and Setup]]
- [[Phase 1 - Hackathon MVP]]
- [[Phase 2 - Campus Pilot]]
- [[Phase 3 - Impact Evaluation]]

