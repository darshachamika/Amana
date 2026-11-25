export const stageLabels = {
  awaiting_documents: "Awaiting documents",
  ready_for_estimate: "Ready for estimate",
  under_review: "Under review",
  decision_recorded: "Decision recorded",
} as const;

export type Stage = keyof typeof stageLabels;

export interface Policy {
  id: string;
  reference: string;
  policyPeriodId: string;
  referenceVersionId: string;
}

export interface QueueItem {
  id: string;
  claimNumber: string;
  policyReference: string;
  stage: Stage;
  assignedOfficer: string | null;
  pendingReason: string | null;
  nextFollowUp: string | null;
}

export interface Claim extends QueueItem {
  incidentDate: string;
  incidentDescription: string;
}

