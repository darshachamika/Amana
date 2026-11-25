import express from "express";
import { randomUUID } from "node:crypto";
import { stageLabels, type Claim, type Policy, type PolicyReferenceHistory } from "../shared/contracts";

const app = express();
app.use(express.json({ limit: "16kb" }));

let policy: Policy = {
  id: "demo-policy",
  reference: "DEMO-MOTOR-001",
  policyPeriodId: "demo-period",
  referenceVersionId: "demo-reference-v1",
};
const policyReferenceHistory: PolicyReferenceHistory[] = [];
const claims = new Map<string, Claim>();

const registrations = new Map<string, Claim>();

function validIncidentDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

app.get("/api/policies", (req, res) => {
  const reference = req.query.reference;
  if (typeof reference !== "string" || reference.trim().toUpperCase() !== policy.reference) {
    res.status(404).json({ message: "No policy matches that reference." });
    return;
  }
  res.json(policy);
});

app.get("/api/policies/:id/history", (req, res) => {
  if (req.params.id !== policy.id) { res.status(404).json({ message: "Policy not found." }); return; }
  res.json(policyReferenceHistory.filter((entry) => entry.policyId === policy.id));
});

app.patch("/api/policies/:id/reference", (req, res) => {
  if (req.params.id !== policy.id) { res.status(404).json({ message: "Policy not found." }); return; }
  const reference = typeof req.body?.reference === "string" ? req.body.reference.trim().toUpperCase() : "";
  if (!/^[A-Z0-9-]{3,40}$/.test(reference)) {
    res.status(400).json({ message: "Enter a policy reference using 3–40 letters, numbers, or hyphens." });
    return;
  }
  if (reference === policy.reference) {
    res.status(400).json({ message: "The corrected reference must be different from the current reference." });
    return;
  }
  const previousReference = policy.reference;
  const changedAt = new Date().toISOString();
  policy = { ...policy, reference, referenceVersionId: `demo-reference-${randomUUID()}` };
  policyReferenceHistory.unshift({
    id: randomUUID(), policyId: policy.id, previousReference, newReference: reference,
    changedAt, changedBy: "Sara Ahmed",
  });
  res.json({ policy, history: policyReferenceHistory.filter((entry) => entry.policyId === policy.id) });
});

app.post("/api/claims", (req, res) => {
  const { policyId, policyPeriodId, referenceVersionId, incidentDate, incidentDescription } = req.body ?? {};
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
  if (!validIncidentDate(incidentDate)) {
    res.status(400).json({ message: "Enter a valid incident date." });
    return;
  }
  const key = req.get("Idempotency-Key");
  if (!key || !/^[A-Za-z0-9_-]{1,128}$/.test(key)) {
    res.status(400).json({ message: "Supply a valid registration request key." });
    return;
  }
  const previous = registrations.get(key);
  if (previous) {
    if (previous.incidentDate !== incidentDate || previous.incidentDescription !== incidentDescription.trim() ||
        previous.policyReference !== policy.reference) {
      res.status(409).json({ message: "This request key already identifies a different registration." });
      return;
    }
    res.json(previous);
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
    incidentDate,
    incidentDescription: incidentDescription.trim(),
  };
  claims.set(id, claim);
  registrations.set(key, claim);
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
    .map(({ incidentDate, incidentDescription, ...item }) => item);
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


type RenewalPolicy = {
  id: string; reference: string; insured: string; vehicle: string;
  periodId: string; periodStart: string; periodEnd: string;
  status: "active" | "cancelled"; outstandingBalance: boolean;
  openClaims: number; coverage: string; sumInsured: number; annualContribution: number;
};
type RenewalException = { id: string; policyId: string; policyReference: string; reason: string; recordedAt: string; status: "open" };
type RenewalRecord = { id: string; policyId: string; policyReference: string; previousPeriodId: string; newPeriodId: string; startDate: string; endDate: string; createdAt: string };
const renewalPolicies: RenewalPolicy[] = [
  { id: "renewal-policy-1", reference: "MT-10045872", insured: "Mohamed Rizan", vehicle: "Toyota Corolla (CBD-4821)", periodId: "period-10045872-2026", periodStart: "2025-12-01", periodEnd: "2026-11-30", status: "active", outstandingBalance: false, openClaims: 0, coverage: "Comprehensive", sumInsured: 5500000, annualContribution: 52800 },
  { id: "renewal-policy-2", reference: "MT-10045873", insured: "Nimali Perera", vehicle: "Honda Fit (CAB-1234)", periodId: "period-10045873-2026", periodStart: "2025-12-10", periodEnd: "2026-12-09", status: "active", outstandingBalance: true, openClaims: 0, coverage: "Third Party", sumInsured: 3200000, annualContribution: 38500 },
  { id: "renewal-policy-3", reference: "MT-10045874", insured: "Kasun Silva", vehicle: "Suzuki Alto (CBB-7788)", periodId: "period-10045874-2026", periodStart: "2025-11-01", periodEnd: "2026-10-31", status: "active", outstandingBalance: false, openClaims: 1, coverage: "Comprehensive", sumInsured: 4100000, annualContribution: 44200 },
];
const renewalExceptions: RenewalException[] = [];
const renewalRecords = new Map<string, RenewalRecord>();
const renewalRequests = new Map<string, RenewalRecord>();
function renewalEligibility(policy: RenewalPolicy) {
  const reasons: string[] = [];
  if (policy.status !== "active") reasons.push("Policy is not active.");
  if (policy.outstandingBalance) reasons.push("Outstanding contribution balance must be settled.");
  if (policy.openClaims > 0) reasons.push("Open claims must be resolved before renewal.");
  return { eligible: reasons.length === 0, reasons };
}
app.get("/api/renewals", (req, res) => {
  const days = Math.min(365, Math.max(0, Number(req.query.withinDays ?? 60)));
  if (!Number.isFinite(days)) { res.status(400).json({ message: "withinDays must be a number." }); return; }
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const items = renewalPolicies.filter((p) => p.periodEnd >= today && p.periodEnd <= cutoff)
    .map((p) => ({ ...p, ...renewalEligibility(p), renewed: renewalRecords.has(p.id) }));
  res.json({ items, exceptions: renewalExceptions });
});
app.post("/api/renewals/:policyId/exceptions", (req, res) => {
  const policy = renewalPolicies.find((p) => p.id === req.params.policyId);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!policy) { res.status(404).json({ message: "Policy not found." }); return; }
  if (!reason || reason.length > 500) { res.status(400).json({ message: "Enter an exception reason of 1–500 characters." }); return; }
  const exception: RenewalException = { id: randomUUID(), policyId: policy.id, policyReference: policy.reference, reason, recordedAt: new Date().toISOString(), status: "open" };
  renewalExceptions.unshift(exception);
  res.status(201).json(exception);
});
app.post("/api/renewals/:policyId/process", (req, res) => {
  const policy = renewalPolicies.find((p) => p.id === req.params.policyId);
  if (!policy) { res.status(404).json({ message: "Policy not found." }); return; }
  const key = req.get("Idempotency-Key");
  if (!key || !/^[A-Za-z0-9_-]{1,128}$/.test(key)) { res.status(400).json({ message: "Supply a valid renewal request key." }); return; }
  const priorRequest = renewalRequests.get(key);
  if (priorRequest) {
    if (priorRequest.policyId !== policy.id) { res.status(409).json({ message: "This request key belongs to another policy." }); return; }
    res.json({ renewal: priorRequest, created: false }); return;
  }
  const existing = renewalRecords.get(policy.id);
  if (existing) { renewalRequests.set(key, existing); res.json({ renewal: existing, created: false }); return; }
  const eligibility = renewalEligibility(policy);
  if (!eligibility.eligible) {
    const reason = eligibility.reasons.join(" ");
    renewalExceptions.unshift({ id: randomUUID(), policyId: policy.id, policyReference: policy.reference, reason, recordedAt: new Date().toISOString(), status: "open" });
    res.status(409).json({ message: "Policy is not eligible for renewal.", reasons: eligibility.reasons });
    return;
  }
  const start = new Date(policy.periodEnd + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  const renewal: RenewalRecord = { id: randomUUID(), policyId: policy.id, policyReference: policy.reference, previousPeriodId: policy.periodId, newPeriodId: randomUUID(), startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), createdAt: new Date().toISOString() };
  renewalRecords.set(policy.id, renewal);
  renewalRequests.set(key, renewal);
  res.status(201).json({ renewal, created: true });
});
app.get("/api/renewals/exceptions", (_req, res) => res.json(renewalExceptions));

app.listen(3001, "127.0.0.1", () => console.log("Demo API running on http://127.0.0.1:3001"));

