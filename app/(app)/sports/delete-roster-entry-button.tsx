"use client";

import { deleteSportRosterEntryAction } from "@/app/sports/roster-actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

type Props = {
  entryId: string;
  sportId: string;
  batchId: string;
  label: string;
  disabled?: boolean;
};

export function DeleteRosterEntryButton({ entryId, sportId, batchId, label, disabled }: Props) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title="Data entry is closed. Batch representatives cannot delete roster rows."
        className="h-9 cursor-not-allowed rounded-lg border border-zinc-200 px-3 text-sm text-zinc-400 opacity-60 dark:border-zinc-700 dark:text-zinc-500"
      >
        Delete
      </button>
    );
  }

  return (
    <form
      action={deleteSportRosterEntryAction}
      onSubmit={(e) => {
        if (!confirm(`Remove roster player "${label}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="sportId" value={sportId} />
      <input type="hidden" name="batchId" value={batchId} />
      <SubmitButton
        pendingText="Deleting…"
        className="h-9 rounded-lg border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete
      </SubmitButton>
    </form>
  );
}
