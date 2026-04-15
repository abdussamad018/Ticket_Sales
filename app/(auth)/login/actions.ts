"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { signIn } from "@/app/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  next: z.string().optional(),
});

export async function loginAction(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  const res = await signIn(parsed.data.email, parsed.data.password);
  if (!res) return { ok: false as const, error: "Invalid email or password." };

  redirect(parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "/dashboard");
}

