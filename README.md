<p align="center">
  <img src="docs/amana-mark.svg" width="136" alt="Amana Motor Workflow project mark">
</p>

<h1 align="center">Amana Takaful Motor Workflow</h1>

<p align="center"><strong>Motor policy lookup and claim tracking in one staff workspace</strong></p>

<p align="center">
  An academic prototype for Group O in CS304.3 Advanced Database Management Systems.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&amp;logo=react&amp;logoColor=12242D">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&amp;logo=typescript&amp;logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-202932?style=for-the-badge&amp;logo=express&amp;logoColor=white">
  <img alt="PostgreSQL planned" src="https://img.shields.io/badge/PostgreSQL-planned-4169E1?style=for-the-badge&amp;logo=postgresql&amp;logoColor=white">
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#claim-workflow">Claim workflow</a> &middot;
  <a href="#run-locally">Run locally</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#contributing">Contributing</a>
</p>

---

## Features

Staff can look up a synthetic motor policy, register a claim against its current policy period and reference version, and review the new claim in the **Staff work queue**. The queue supports stage filtering, and each claim opens a detail view with the incident description.

| Available in the prototype | Planned |
| --- | --- |
| Policy lookup, claim registration, stage filtering, and claim details | Policy renewals, document verification, estimate review, and claim decisions |
| In-memory synthetic policy and claim records | PostgreSQL persistence, staff access controls, audit history, reporting, and recovery |

## Claim workflow

```mermaid
flowchart LR
  Policy["Find policy"] --> Intake["Register claim"]
  Intake --> Queue["Awaiting documents"]
  Queue -.-> Verify["Verify documents"]
  Verify -.-> Estimate["Review estimate"]
  Estimate -.-> Decision["Record decision"]
```

A newly registered claim appears under **Awaiting documents**. Dotted arrows show planned transitions.

## Run locally

Install Node.js 24 and npm. From the repository root, install dependencies.

```sh
npm install
```

Start the API and web app in separate terminals.

| Terminal | Command | Local address |
| --- | --- | --- |
| API | `npm run dev:api` | `http://localhost:3001` |
| Web | `npm run dev:web` | Usually `http://localhost:5173` |

1. Open the URL printed by Vite and search for `DEMO-MOTOR-001`.
2. Enter an incident description and register the claim.
3. In the **Staff work queue**, select **Awaiting documents** and open the new claim number.

The demo runs without environment variables. Restarting the API clears registered claims. The planned PostgreSQL connection setting is documented in [the environment example](.env.example).

Run `npm run check` for TypeScript validation and `npm run build` for the production frontend build.

## Architecture

The React staff workspace calls the Express API, which stores demo records in memory. The planned PostgreSQL integration will persist policy and claim records.

| Path | Responsibility |
| --- | --- |
| `frontend/` | React workspace for policy lookup, claim intake, the work queue, and claim details |
| `backend/` | Express API and synthetic records |
| `shared/` | TypeScript contracts for policies and claims |
| `database/` | PostgreSQL handoff |
| `docs/` | API contract and integration notes |

[API contract](docs/api-contract.md) · [Database handoff](database/README.md)

## Contributing

Create a feature branch from `main` and open a pull request with verification steps. Coordinate schema changes with Thisandu and shared workflow changes with Chami. During integration, use the same synthetic claim to verify intake, document verification, estimate review, and the final decision.
