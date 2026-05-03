"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type BatchOption = { id: string; code: string; name: string | null };

function formatBatch(b: BatchOption) {
  return b.name ? `${b.code} — ${b.name}` : b.code;
}

export function BatchSearchCombobox({
  batches,
  inputName = "batchId",
  id = "batchId",
}: {
  batches: BatchOption[];
  inputName?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => batches.find((b) => b.id === selectedId) ?? null, [batches, selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(
      (b) =>
        b.code.toLowerCase().includes(q) || (b.name ? b.name.toLowerCase().includes(q) : false),
    );
  }, [batches, search]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="relative max-w-xl">
      <input type="hidden" name={inputName} value={selectedId} required />

      <label className="text-sm font-medium" htmlFor={`${id}-trigger`}>
        Batch
      </label>
      <button
        id={`${id}-trigger`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setSearch("");
        }}
        className="mt-1 flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 text-left text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30"
      >
        <span className={selected ? "font-medium text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}>
          {selected ? formatBatch(selected) : "Select batch…"}
        </span>
        <span className="shrink-0 text-zinc-400" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="border-b border-black/5 p-2 dark:border-white/10">
            <input
              type="search"
              autoComplete="off"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or name…"
              aria-label="Search batches"
              className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-white/30"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-500">No matching batch.</li>
            ) : (
              filtered.map((b) => (
                <li key={b.id} role="option" aria-selected={b.id === selectedId}>
                  <button
                    type="button"
                    className="flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => {
                      setSelectedId(b.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className="font-medium">{b.code}</span>
                    {b.name ? <span className="ml-2 text-zinc-600 dark:text-zinc-400">{b.name}</span> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {selected && !open ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Change selection with the button above. Required before saving.
        </p>
      ) : null}
    </div>
  );
}
