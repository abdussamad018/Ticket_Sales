"use client";

import { useState } from "react";

export function BackfillCheckInCodesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!confirm("Assign check-in codes to all attendees who do not have one yet?")) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/backfill-check-in-codes", { method: "POST" });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Backfill failed.");
        return;
      }
      setMessage(data.message ?? "Done.");
    } catch {
      setError("Backfill failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="h-11 rounded-xl border border-black/15 bg-white px-4 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-white/10"
      >
        {loading ? "Running…" : "Backfill check-in codes"}
      </button>
      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
