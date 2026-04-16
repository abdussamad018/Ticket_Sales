"use client";

import { useId, useMemo, useState } from "react";

type Batch = { id: string; code: string };

type Props = {
  batches: Batch[];
  /** Hidden input name to submit selected batch id */
  name: string;
  /** Label text (optional) */
  label?: string;
  /** Initial selected id (optional) */
  defaultBatchId?: string;
  /** If true, allows empty selection (All batches) */
  allowAll?: boolean;
  /** Placeholder shown in the input */
  placeholder?: string;
  /** Extra classes for the text input */
  inputClassName?: string;
};

export function BatchCombobox({
  batches,
  name,
  label,
  defaultBatchId,
  allowAll,
  placeholder,
  inputClassName,
}: Props) {
  const listId = useId();
  const byCode = useMemo(() => new Map(batches.map((b) => [b.code.toLowerCase(), b])), [batches]);
  const byId = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);

  const initial = defaultBatchId ? byId.get(defaultBatchId) : undefined;
  const [text, setText] = useState<string>(initial?.code ?? "");
  const [selectedId, setSelectedId] = useState<string>(initial?.id ?? "");

  function sync(nextText: string) {
    setText(nextText);
    const trimmed = nextText.trim().toLowerCase();
    const match = byCode.get(trimmed);
    if (match) setSelectedId(match.id);
    else if (allowAll && trimmed === "") setSelectedId("");
    else setSelectedId("");
  }

  return (
    <div className="space-y-1">
      {label ? (
        <label className="text-sm font-medium" htmlFor={listId}>
          {label}
        </label>
      ) : null}

      <input type="hidden" name={name} value={selectedId} />

      <input
        id={listId}
        list={`${listId}-list`}
        value={text}
        onChange={(e) => sync(e.target.value)}
        placeholder={placeholder ?? (allowAll ? "Type batch year (e.g. 2013) or leave empty" : "Type batch year (e.g. 2013)")}
        className={
          inputClassName ??
          "h-11 min-w-[12rem] rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30"
        }
      />

      <datalist id={`${listId}-list`}>
        {batches.map((b) => (
          <option key={b.id} value={b.code} />
        ))}
      </datalist>

      {!allowAll && !selectedId ? (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Select a valid batch from the list.</div>
      ) : null}
    </div>
  );
}

