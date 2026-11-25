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


export interface PolicyReferenceHistory {
  id: string;
  policyId: string;
  previousReference: string;
  newReference: string;
  changedAt: string;
  changedBy: string;
}

export interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface EstimateVersion {
  id: string;
  version: number;
  lineItems: EstimateLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  createdBy: string;
}

export interface EstimateComment {
  id: string;
  estimateId: string;
  version: number;
  action: "comment" | "approve" | "amend" | "return";
  comment: string;
  reviewer: string;
  createdAt: string;
}

export interface EstimateDecision {
  id: string;
  estimateId: string;
  version: number;
  action: "approve" | "reject" | "request_changes";
  reason: string;
  officer: string;
  timestamp: string;
}

export interface EstimateRecord {
  id: string;
  claimReference: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  currentVersion: number;
  versions: EstimateVersion[];
  comments: EstimateComment[];
  decisions: EstimateDecision[];
  current: EstimateVersion;
}
