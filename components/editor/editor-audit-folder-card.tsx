import {
  AuditFolderCard,
  type AuditFolderCardWorkflowFolder,
} from "@/components/audit-folder-card";

export type FolderForCard = AuditFolderCardWorkflowFolder;

export function EditorAuditFolderCard({ folder }: { folder: FolderForCard }) {
  return (
    <AuditFolderCard
      folder={folder}
      href={`/editor/folders/${folder.id}`}
      variant="workflow"
    />
  );
}
