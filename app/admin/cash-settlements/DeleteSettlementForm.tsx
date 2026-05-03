"use client";

import { deleteBatchCashSettlementAction } from "@/app/admin/cash-settlements/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

export function DeleteSettlementForm({
  settlementId,
  batchCode,
  amountBdt,
}: {
  settlementId: string;
  batchCode: string;
  amountBdt: number;
}) {
  return (
    <form
      action={deleteBatchCashSettlementAction}
      className="inline"
      onSubmit={(e) => {
        const ok = window.confirm(
          `Delete this cash settlement?\n\nBatch: ${batchCode}\nAmount: ${amountBdt.toLocaleString()} BDT\n\nThis cannot be undone.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="settlementId" value={settlementId} />
      <SubmitButton
        pendingText="Deleting…"
        className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
      >
        Delete
      </SubmitButton>
    </form>
  );
}
