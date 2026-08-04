import { AuditFolderCard, type AuditFolderCardFolder } from "@/components/audit-folder-card";

export type FolderForCard = AuditFolderCardFolder;

export function EditorAuditFolderCard({ folder }: { folder: FolderForCard }) {
  return <AuditFolderCard folder={folder} href={`/editor/folders/${folder.id}`} />;
}
