# CarbonLoop API Contract v1

Base path: `/api/v1`. This package defines validation contracts only; it creates no routes, database schema, Android DTOs, or business logic.

All failures use the stable API error schema and require a UUID request ID. Future resources are `/players`, `/consent-events`, `/quest-templates`, `/quest-runs`, `/activities`, `/evidence`, `/calculations`, `/scores`, `/rewards`, `/redemptions`, and `/campus/aggregates`.

Campus IDs, routes, privacy thresholds, issuer references, factor values, methodology versions, reward conversion rates, and provider configuration remain **NEEDS_VERIFICATION**. No emission-factor number is defined by this contract.
