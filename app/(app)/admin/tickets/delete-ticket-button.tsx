"use client";

import { deleteTicketAction } from "@/app/admin/tickets/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

type Props = {
  ticketId: string;
  ticketLabel: string;
};

export function DeleteTicketButton({ ticketId, ticketLabel }: Props) {
  return (
    <form
      action={deleteTicketAction}
      onSubmit={(e) => {
        if (!confirm(`Delete ticket "${ticketLabel}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={ticketId} />
      <SubmitButton
        pendingText="Deleting…"
        className="h-9 rounded-lg border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete
      </SubmitButton>
    </form>
  );
}
