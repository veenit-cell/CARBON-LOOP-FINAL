# @carbonloop/factor-registry

Versioned emission-factor contracts for CarbonLoop. Factor versions are immutable snapshots: their numeric values, units, provenance, and version identifiers are never changed in place. Historical calculations can therefore keep referencing their original factor snapshot.

Lifecycle state is represented by append-only `draft_created`, `approved`, and `retired` events. The current state is derived from ordered event history; it is not stored as an independently editable status on the factor version. Lifecycle events contain no factor value, unit, or provenance fields.

For new calculations, deterministic selection ranks approved and effective candidates by geography: campus, city, state, country/India, international fallback, then spend-based fallback. At the same geography level it ranks documented activity specificity, source/quality priority, then the most recent effective version. Equal-ranked candidates that disagree in value, source, or methodology return `ambiguous`; selection never breaks those ties by ID.

International and spend-based candidates are eligible only when their respective fallback controls are enabled. `activityOccurredAt` determines effective-date applicability, while `selectionPerformedAt` determines whether approval or retirement permits a new selection. Historical reproductions must use their stored immutable snapshot via `requireHistoricalFactorSnapshot`, never current registry selection.

`quantityUnit` and `factorUnit` follow the current shared-schema unit contract: non-empty strings. Selection currently requires the exact quantity unit and a factor unit ending in `/<quantityUnit>`; canonical unit conversions are not yet available.

Real methodology approval, factor sources, reviewers, geography mappings, factor priorities, and institutional authorization remain `NEEDS_VERIFICATION`. This package does not implement baselines, calculations, rewards, persistence, APIs, UI, or Android features.