import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Only images are allowed" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "payments");
  await mkdir(uploadsDir, { recursive: true });

  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const safeExt = ext.length <= 10 ? ext : "";
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
  const filepath = path.join(uploadsDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const urlPath = `/uploads/payments/${filename}`;
  return NextResponse.json({ ok: true, url: urlPath });
}

