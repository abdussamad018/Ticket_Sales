"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/app/ui/Spinner";

type Props = {
  href: string;
  className?: string;
  pendingText?: string;
  children: React.ReactNode;
};

export function LoadingLinkButton({ href, className, pendingText, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-disabled={pending}
      onClick={() => startTransition(() => router.push(href))}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <Spinner className="h-4 w-4 animate-spin" /> : null}
        <span>{pending && pendingText ? pendingText : children}</span>
      </span>
    </button>
  );
}

