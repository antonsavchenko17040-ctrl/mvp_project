export type UserRole = "editor" | "ssp" | "manager" | "analyst" | "admin";

export type RecommendationStatus =
  | "draft"
  | "ssp_draft"
  | "in_progress"
  | "manager_review"
  | "on_review"
  | "revision"
  | "published";

export interface Profile {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  roles: UserRole[];
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface AuditFolder {
  id: string;
  title: string;
  year: number;
  createdAt: string;
  createdById: string;
  archivedAt: string | null;
}

export interface Recommendation {
  id: string;
  auditFolderId: string;
  deficiency: string;
  recommendationText: string;
  executionIndicator: string;
  expectedResult: string;
  sspUnit: string;
  deadline: string;
  status: RecommendationStatus;
  assigneeUserId: string | null;
  progressReport: string | null;
  measuresDescription: string | null;
  analystComment: string | null;
  createdAt: string;
  updatedAt: string;
}
