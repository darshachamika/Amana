import express from "express";
import { randomUUID } from "node:crypto";
import { stageLabels, type Claim, type Policy } from "../shared/contracts";

const app = express();
app.use(express.json({ limit: "16kb" }));

const policy: Policy = {
  id: "demo-policy",
  reference: "DEMO-MOTOR-001",
  policyPeriodId: "demo-period",
  referenceVersionId: "demo-reference-v1",
};
const claims = new Map<string, Claim>();

app.get("/api/policies", (req, res) => {
  const reference = req.query.reference;
  if (typeof reference !== "string" || reference.trim().toUpperCase() !== policy.reference) {
    res.status(404).json({ message: "No policy matches that reference." });
    return;
  }
  res.json(policy);
});

app.post("/api/claims", (req, res) => {
  const { policyId, policyPeriodId, referenceVersionId, incidentDescription } = req.body ?? {};
  if (policyId !== policy.id || policyPeriodId !== policy.policyPeriodId ||
      referenceVersionId !== policy.referenceVersionId) {
    res.status(400).json({ message: "Select a valid policy reference and period." });
    return;
  }
  if (typeof incidentDescription !== "string" || !incidentDescription.trim() ||
      incidentDescription.trim().length > 1000) {
    res.status(400).json({ message: "Enter an incident description of 1–1000 characters." });
    return;
  }
  const id = randomUUID();
  const claim: Claim = {
    id,
    claimNumber: `CLM-${String(claims.size + 1).padStart(5, "0")}`,
    policyReference: policy.reference,
    stage: "awaiting_documents",
    assignedOfficer: null,
    pendingReason: "Supporting documents required",
    nextFollowUp: null,
    incidentDescription: incidentDescription.trim(),
  };
  claims.set(id, claim);
  res.status(201).json(claim);
});

app.get("/api/claims", (req, res) => {
  const stage = req.query.stage;
  if (stage !== undefined && (typeof stage !== "string" || !Object.hasOwn(stageLabels, stage))) {
    res.status(400).json({ message: "Unknown workflow stage." });
    return;
  }
  const items = [...claims.values()].reverse()
    .filter((claim) => stage === undefined || claim.stage === stage)
    .map(({ incidentDescription, ...item }) => item);
  res.json(items);
});

app.get("/api/claims/:id", (req, res) => {
  const claim = claims.get(req.params.id);
  if (!claim) {
    res.status(404).json({ message: "Claim not found." });
    return;
  }
  res.json(claim);
});

app.listen(3001, "127.0.0.1", () => console.log("Demo API running on http://127.0.0.1:3001"));

