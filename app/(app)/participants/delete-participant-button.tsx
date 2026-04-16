"use client";

import { deleteParticipantAction } from "@/app/participants/actions";

type Props = {
  participantId: string;
  label: string;
};

export function DeleteParticipantButton({ participantId, label }: Props) {
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
      <button
        type="submit"
        className="h-9 rounded-lg border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete
      </button>
    </form>
  );
}
