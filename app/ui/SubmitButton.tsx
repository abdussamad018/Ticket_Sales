"use client";

import { useFormStatus } from "react-dom";

import { Spinner } from "@/app/ui/Spinner";

type Props = {
  className?: string;
  pendingText?: string;
  children: React.ReactNode;
};

export function SubmitButton({ className, pendingText, children }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      aria-disabled={pending}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <Spinner className="h-4 w-4 animate-spin" /> : null}
        <span>{pending && pendingText ? pendingText : children}</span>
      </span>
    </button>
  );
}

