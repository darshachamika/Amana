# Proposed staff workflow API

| Request | Result |
|---|---|
| GET /api/policies?reference=DEMO-MOTOR-001 | Exact current-reference lookup |
| PATCH /api/policies/:id/reference | Correct a policy reference; returns the updated policy and its reference history |
| GET /api/policies/:id/history | List previous and current policy-reference changes, newest first |
| POST /api/claims | Register using `policyId`, `policyPeriodId`, `referenceVersionId`, `incidentDate` (YYYY-MM-DD) and `incidentDescription` |
| GET /api/claims | Queue items |
| GET /api/claims?stage=awaiting_documents | Filtered queue |
| GET /api/claims/:id | Queue fields plus incident date and description |

Supply an `Idempotency-Key` header with each registration. The demo returns 201 on creation, 200 for a matching retry, and 409 if a key is reused with different claim details. Claims and keys live in memory until the API restarts.

See [shared contracts](../shared/contracts.ts) for response fields and proposed stages. The demo starts at `awaiting_documents`. The document module should move a claim to `ready_for_estimate` when the current reference check and required latest documents pass. Confirm stage ownership and transition rules with the intake and verification owners before merging their modules.

Production integration needs authenticated staff roles, persisted claim and policy linkage, duplicate-request protection, and a queue sourced from the same committed state as document verification. Hemachandra owns staff access controls.

## Policy renewal workflow

| Request | Result |
|---|---|
| GET /api/renewals?withinDays=60 | Expiring policies with eligibility reasons and renewal status |
| POST /api/renewals/:policyId/exceptions | Record a staff exception using a 1–500 character `reason` |
| POST /api/renewals/:policyId/process | Process an eligible renewal; requires an `Idempotency-Key` header |
| GET /api/renewals/exceptions | List recorded exceptions |

The demo eligibility rules require an active policy, no outstanding contribution balance, and no open claims. Ineligible renewal attempts return 409 and automatically record the eligibility reasons as an exception. Staff can also record a manually supplied exception reason.

Renewal processing is idempotent per policy: the first successful request creates one new policy-period record, while a matching request retry or a later request with a different key returns the existing record rather than creating another period. A key reused for a different policy returns 409. The new period begins the day after the expiring period and ends one day before the same date in the following year.

**Prototype limitation:** policies, renewal periods, idempotency keys, and exceptions are held in memory and reset when the API restarts. For production, enforce one renewal per source period with a database unique constraint and perform the renewal insert and idempotency record in one transaction.


Policy reference corrections are validated as 3–40 uppercase letters, numbers, or hyphens. Each successful correction creates a history entry containing the previous reference, new reference, timestamp, and staff actor. The demo history is held in memory and resets when the API restarts; production must persist corrections and history together in a database transaction and derive the actor from the authenticated staff session.


## Document verification workflow

| Request | Result |
|---|---|
| GET /api/claims | List claims available to the document checklist |
| GET /api/documents/:claimId | Required checklist and complete version history for each document |
| POST /api/documents/:claimId/:documentId/uploads | Save a synthetic upload as the next document version; resets its verification to pending |
| POST /api/documents/:claimId/:documentId/verification | Record a verified or rejected outcome, reviewer, timestamp, and note against the current version |

The required checklist contains the completed claim form, national identity card, vehicle registration, and accident photographs. A claim moves to `ready_for_estimate` only when the current version of every required document is explicitly verified. Uploading a replacement version returns that document to pending and moves the claim back to `awaiting_documents` until it is verified again. The prototype stores metadata and synthetic filenames only; it does not accept or persist binary file content. All records are in memory and reset when the API restarts.
