"use client";

import { deleteParticipantAction } from "@/app/participants/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

type Props = {
  participantId: string;
  label: string;
  /** When true, delete is not offered (e.g. batch rep after registration closed). */
  disabled?: boolean;
};

export function DeleteParticipantButton({ participantId, label, disabled }: Props) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title="Registration is closed. Batch representatives cannot delete entries."
        className="h-9 cursor-not-allowed rounded-lg border border-zinc-200 px-3 text-sm text-zinc-400 opacity-60 dark:border-zinc-700 dark:text-zinc-500"
      >
        Delete
      </button>
    );
  }

  return (
    <form
      action={deleteParticipantAction}
      onSubmit={(e) => {
        if (!confirm(`Delete participant entry "${label}"? This removes all attendee rows.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={participantId} />
      <SubmitButton
        pendingText="Deleting…"
        className="h-9 rounded-lg border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete
      </SubmitButton>
    </form>
  );
}
