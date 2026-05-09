"use client";

import { deleteSportAction } from "@/app/admin/sports/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

type Props = {
  sportId: string;
  sportName: string;
};

export function DeleteSportButton({ sportId, sportName }: Props) {
  return (
    <form
      action={deleteSportAction}
      onSubmit={(e) => {
        if (!confirm(`Delete sport "${sportName}" and all roster rows for every batch?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={sportId} />
      <SubmitButton
        pendingText="Deleting…"
        className="h-11 rounded-xl border border-red-400 bg-white px-4 text-sm text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
      >
        Delete sport
      </SubmitButton>
    </form>
  );
}
