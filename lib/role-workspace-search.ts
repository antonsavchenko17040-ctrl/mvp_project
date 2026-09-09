export const ROLE_WORKSPACE_SEARCH_FIELDS = [
  { value: "reportTitle", label: "Назва звіту" },
  { value: "deficiency", label: "Виявлені недоліки" },
  { value: "recommendationText", label: "Зміст рекомендації" },
] as const;

export type RoleWorkspaceSearchField = (typeof ROLE_WORKSPACE_SEARCH_FIELDS)[number]["value"];

export function parseRoleWorkspaceSearchField(raw: string | undefined): RoleWorkspaceSearchField | "" {
  const value = (raw ?? "").trim();
  return ROLE_WORKSPACE_SEARCH_FIELDS.some((field) => field.value === value)
    ? (value as RoleWorkspaceSearchField)
    : "";
}

type RoleWorkspaceSearchableItem = {
  auditFolder: { title: string };
  deficiency: string | null;
  recommendationText: string | null;
};

export function matchesRoleWorkspaceSearch(
  item: RoleWorkspaceSearchableItem,
  query: string,
  field: RoleWorkspaceSearchField | "",
): boolean {
  if (!query) return true;

  const reportTitle = item.auditFolder.title.toLowerCase();
  const deficiency = (item.deficiency ?? "").toLowerCase();
  const recommendationText = (item.recommendationText ?? "").toLowerCase();

  if (field === "reportTitle") return reportTitle.includes(query);
  if (field === "deficiency") return deficiency.includes(query);
  if (field === "recommendationText") return recommendationText.includes(query);

  return (
    reportTitle.includes(query) ||
    deficiency.includes(query) ||
    recommendationText.includes(query)
  );
}
