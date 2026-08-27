# @carbonloop/factor-registry

Versioned emission-factor contracts for CarbonLoop. Factor versions are immutable snapshots: their numeric values, units, provenance, and version identifiers are never changed in place. Historical calculations can therefore keep referencing their original factor snapshot.

Lifecycle state is represented by append-only `draft_created`, `approved`, and `retired` events. The current state is derived from ordered event history; it is not stored as an independently editable status on the factor version. Lifecycle events contain no factor value, unit, or provenance fields.

`quantityUnit` and `factorUnit` follow the current shared-schema unit contract: non-empty strings. A canonical unit catalogue has not yet been introduced in `@carbonloop/schemas`.

Real methodology approval, factor sources, reviewers, and institutional authorization remain `NEEDS_VERIFICATION`. This package does not implement factor selection, calculations, persistence, APIs, or UI.