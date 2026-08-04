import { SUPPLEMENT_FIELD_LABELS } from "@/lib/editor/recommendation-supplements";
import { db } from "@/lib/db";
import { uk } from "@/lib/i18n/uk";
import type { RecommendationStatus, UserRole } from "@/lib/types";

/** Українські назви полів рекомендації / інших сутностей для Audit Log. */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  ...SUPPLEMENT_FIELD_LABELS,
  status: "Статус",
  assigneeUserId: "Відповідальна особа",
  progressReport: "Стан впровадження рекомендацій",
  measuresDescription: "Заходи з впровадження рекомендацій",
  actualImplementationDate: "Фактична дата впровадження",
  expectedAchievement: "Досягнення очікуваного",
  supportingDocuments: "Підтверджуючі документи",
  sspNotes: "Примітки",
  managerComment: "Коментар керівника",
  analystComment: "Коментар аналітика",
  sequenceNumber: "Номер рекомендації",
  intent: "Намір збереження",
  isActive: "Активність",
  email: "Email",
  fullName: "ПІБ",
  role: "Роль",
  name: "Назва",
};

export function fieldLabelUk(field: string): string {
  return AUDIT_FIELD_LABELS[field] ?? field;
}

export type AuditEntityType = "recommendation" | "audit_folder" | "user" | "department" | "system";

/** Одна зміна поля / статусу в Difference. */
export type AuditFieldChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export type AuditDifference = {
  changes: AuditFieldChange[];
};

export type WriteAuditLogInput = {
  actor?: {
    id?: string | null;
    email?: string | null;
    fullName?: string | null;
  } | null;
  actorRole?: UserRole | string | null;
  action: string;
  entityType: AuditEntityType;
  entityId?: string | null;
  recommendationId?: string | null;
  auditFolderId?: string | null;
  summary: string;
  /** Difference: before/after змін статусу або полів. */
  difference?: AuditDifference | Record<string, unknown>;
};

export function buildStatusDifference(
  from: RecommendationStatus | string | null | undefined,
  to: RecommendationStatus | string | null | undefined,
): AuditDifference {
  return {
    changes: [{ field: "status", before: from ?? null, after: to ?? null }],
  };
}

export function buildFieldDifference(
  field: string,
  before: unknown,
  after: unknown,
): AuditDifference {
  return {
    changes: [{ field, before: before ?? null, after: after ?? null }],
  };
}

/** Порівняння двох об’єктів: лише змінені ключі потрапляють у Difference. */
export function buildObjectDifference(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditDifference {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: AuditFieldChange[] = [];
  for (const field of keys) {
    const prev = normalizeDiffValue(before[field]);
    const next = normalizeDiffValue(after[field]);
    if (prev !== next) {
      changes.push({ field, before: before[field] ?? null, after: after[field] ?? null });
    }
  }
  return { changes };
}

function normalizeDiffValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function parseAuditDifference(differenceJson: string): AuditFieldChange[] {
  try {
    const parsed = JSON.parse(differenceJson || "{}") as AuditDifference | Record<string, unknown>;
    if (Array.isArray((parsed as AuditDifference).changes)) {
      return (parsed as AuditDifference).changes;
    }
    if (parsed && typeof parsed === "object") {
      return normalizeDifference(parsed as Record<string, unknown>).changes;
    }
    return [];
  } catch {
    return [];
  }
}

export function formatChangeLine(change: AuditFieldChange, valueMaxLen = 120): string {
  const before = truncateDiffText(formatDiffScalar(change.before), valueMaxLen);
  const after = truncateDiffText(formatDiffScalar(change.after), valueMaxLen);
  return `${fieldLabelUk(change.field)}: «${before}» → «${after}»`;
}

export function formatDifferenceText(differenceJson: string): string {
  const changes = parseAuditDifference(differenceJson);
  if (changes.length > 0) {
    return changes.map((change) => formatChangeLine(change)).join("; ");
  }
  try {
    const parsed = JSON.parse(differenceJson || "{}") as unknown;
    if (parsed && typeof parsed === "object" && Object.keys(parsed as object).length > 0) {
      return JSON.stringify(parsed);
    }
  } catch {
    if (differenceJson) return differenceJson;
  }
  return "—";
}

/** Опис для UI: короткий summary + деталі змінених полів. */
export function formatAuditDescription(summary: string, differenceJson: string): {
  headline: string;
  details: string[];
} {
  const changes = parseAuditDifference(differenceJson);
  const details = changes.map((change) => formatChangeLine(change, 160));
  const headline = (summary || "").trim() || (details.length > 0 ? "Зафіксовано зміни" : "—");
  return { headline, details };
}

/** Summary для запису: базовий текст + перелік змінених областей. */
export function buildUpdateSummary(base: string, difference: AuditDifference): string {
  const labels = difference.changes.map((change) => fieldLabelUk(change.field));
  if (labels.length === 0) {
    return `${base} (без змін полів)`;
  }
  return `${base}. Змінено: ${labels.join(", ")}`;
}

function truncateDiffText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 1))}…`;
}

function formatDiffScalar(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && value in uk.status) {
    return uk.status[value as keyof typeof uk.status];
  }
  if (value instanceof Date) {
    return value.toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return String(value);
}

/** Безпечний запис у журнал: AgentID + Timestamp + Difference. */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        /** AgentID */
        agentId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? "",
        actorName: input.actor?.fullName ?? "",
        actorRole: input.actorRole ? String(input.actorRole) : "",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? input.recommendationId ?? input.auditFolderId ?? "",
        recommendationId: input.recommendationId ?? null,
        auditFolderId: input.auditFolderId ?? null,
        summary: input.summary,
        /** Difference (JSON) */
        difference: JSON.stringify(normalizeDifference(input.difference)),
      },
    });
  } catch (error) {
    console.error("[audit-log] failed to write entry", error);
  }
}

function normalizeDifference(
  input?: AuditDifference | Record<string, unknown>,
): AuditDifference {
  if (!input) return { changes: [] };
  if (Array.isArray((input as AuditDifference).changes)) {
    return input as AuditDifference;
  }
  const record = input as Record<string, unknown>;
  if ("from" in record && "to" in record) {
    const rest = { ...record };
    delete rest.from;
    delete rest.to;
    const statusDiff = buildStatusDifference(
      record.from as string | null | undefined,
      record.to as string | null | undefined,
    );
    const extras = Object.entries(rest).map(([field, after]) => ({
      field,
      before: null as unknown,
      after,
    }));
    return { changes: [...statusDiff.changes, ...extras] };
  }
  return {
    changes: Object.entries(record).map(([field, after]) => ({
      field,
      before: null,
      after,
    })),
  };
}

export function statusLabelUk(status: RecommendationStatus | string | null | undefined): string {
  if (!status) return "—";
  const key = status as keyof typeof uk.status;
  return uk.status[key] ?? String(status);
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "recommendation.created": "Створено рекомендацію",
  "recommendation.updated": "Оновлено рекомендацію",
  "recommendation.status_changed": "Змінено статус",
  "recommendation.started": "Передано на виконання",
  "recommendation.submitted_manager": "Надіслано керівнику",
  "recommendation.submitted_analyst": "Передано аналітику",
  "recommendation.published": "Підтверджено виконання",
  "recommendation.revision": "Повернено на доопрацювання",
  "recommendation.supplemented": "Доповнено поле",
  "recommendation.deactivated": "Деактивовано",
  "recommendation.reactivated": "Повторно активовано",
  "recommendation.deleted": "Видалено рекомендацію",
  "audit_folder.created": "Створено папку аудиту",
  "audit_folder.archived": "Архівовано папку аудиту",
  "audit_folder.deleted": "Видалено папку аудиту",
  "user.created": "Створено користувача",
  "user.role_assigned": "Призначено роль",
  "user.deleted": "Видалено користувача",
  "user.password_reset": "Скинуто пароль",
  "department.created": "Створено підрозділ",
  "department.archived": "Архівовано підрозділ",
  "department.member_assigned": "Додано до підрозділу",
  "department.member_removed": "Вилучено з підрозділу",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
