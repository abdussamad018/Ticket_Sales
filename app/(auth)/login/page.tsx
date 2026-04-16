import Link from "next/link";

import { loginAction } from "@/app/(auth)/login/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Alumni Event entry & reporting system
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              placeholder="••••••••"
            />
          </div>

          <SubmitButton
            pendingText="Signing in…"
            className="h-11 w-full rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Sign in
          </SubmitButton>
        </form>

        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link className="underline underline-offset-4" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

