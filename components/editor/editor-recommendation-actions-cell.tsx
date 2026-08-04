"use client";

import type { ReactNode } from "react";

export function EditorRecommendationActionsCell({ children }: { children: ReactNode }) {
  return (
    <td className="w-12 p-1 text-center align-top" onClick={(e) => e.stopPropagation()}>
      {children}
    </td>
  );
}
