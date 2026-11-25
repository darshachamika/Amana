# Proposed staff workflow API

| Request | Result |
|---|---|
| GET /api/policies?reference=DEMO-MOTOR-001 | Exact reference lookup |
| POST /api/claims | Register using `policyId`, `policyPeriodId`, `referenceVersionId`, `incidentDate` (YYYY-MM-DD) and `incidentDescription` |
| GET /api/claims | Queue items |
| GET /api/claims?stage=awaiting_documents | Filtered queue |
| GET /api/claims/:id | Queue fields plus incident date and description |

Supply an `Idempotency-Key` header with each registration. The demo returns 201 on creation, 200 for a matching retry, and 409 if a key is reused with different claim details. Claims and keys live in memory until the API restarts.

See [shared contracts](../shared/contracts.ts) for response fields and proposed stages. The demo starts at `awaiting_documents`. The document module should move a claim to `ready_for_estimate` when the current reference check and required latest documents pass. Confirm stage ownership and transition rules with the intake and verification owners before merging their modules.

Production integration needs authenticated staff roles, persisted claim and policy linkage, duplicate-request protection, and a queue sourced from the same committed state as document verification. Hemachandra owns staff access controls.

