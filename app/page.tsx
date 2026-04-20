import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

function IconCoffee({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 10V6a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v4" />
      <path d="M6 10h12v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-6Z" />
      <path d="M18 12h1a2 2 0 0 1 0 4h-1" />
    </svg>
  );
}

function IconUtensils({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 3v9a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3" />
      <path d="M10 3v18" />
      <path d="M16 8v13" />
      <path d="M19 8v2a2 2 0 0 1-2 2h-1" />
    </svg>
  );
}

function IconCookie({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconShirt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 8l3-4h6l3 4v14H6V8Z" />
      <path d="M9 4 8 8M15 4l1 4" />
    </svg>
  );
}

function IconGift({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="10" width="18" height="11" rx="1" />
      <path d="M12 10V21M3 14h18" />
      <path d="M12 10H8.5a2.5 2.5 0 0 1 0-5C11 5 12 10 12 10Zm0 0h3.5a2.5 2.5 0 0 0 0-5C13 5 12 10 12 10Z" />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v3M8 21h8" />
    </svg>
  );
}

function IconBaby({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 12h.01M15 12h.01" />
      <path d="M10 16h4" />
      <circle cx="12" cy="8" r="5" />
      <path d="M18 21a6 6 0 0 0-12 0" />
    </svg>
  );
}

function IconDoor({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 22h16V4a2 2 0 0 0-2-2H8v20" />
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 12 6 9l3-3 3 3-3 3Zm6 6-2-2 2-2 2 2-2 2Z" />
      <path d="m16 4 1 1 1-1-1-1-1 1ZM5 19l1 1 1-1-1-1-1 1Z" />
    </svg>
  );
}

function FacilityItem({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-zinc-800">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-600" />
      <span>{label}</span>
    </div>
  );
}

function SectionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white sm:text-base ${className}`}
      style={{ backgroundColor: "#004A99" }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 text-zinc-900">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        <header className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="shrink-0 rounded-full border-2 border-white bg-white p-1 shadow-md ring-2 ring-[#004A99]/20">
            <Image
              src="/kmlhsaa_logo.jpg"
              alt="KMLHSAA"
              width={56}
              height={56}
              className="rounded-full"
              priority
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold leading-snug sm:text-2xl" style={{ color: "#004A99" }}>
              খাজুরিয়া বহুমুখী উচ্চ বিদ্যালয় অ্যালামনাই অ্যাসোসিয়েশন (KMLHSAA)
            </h1>
            <p className="text-base font-medium sm:text-lg" style={{ color: "#004A99" }}>
              অ্যালামনাই ডে — লং প্রোগ্রাম ২০২৬ | অভিষেক ও ঈদ পুনর্মিলনী
            </p>
          </div>
        </header>

        <SectionBar>নিবন্ধন ফি তালিকা</SectionBar>

        <div className="mt-6 space-y-6">
          {/* Alumni */}
          <article
            className="overflow-hidden rounded-2xl border-2 bg-white shadow-sm"
            style={{ borderColor: "#004A99" }}
          >
            <div className="grid sm:grid-cols-[minmax(0,11rem)_1fr]">
              <div className="flex flex-col justify-center gap-1 border-b p-5 sm:border-b-0 sm:border-e" style={{ borderColor: "#004A9918", background: "#004A9908" }}>
                <p className="text-sm font-semibold leading-snug" style={{ color: "#004A99" }}>
                  অ্যালামনাই (প্রাক্তন ছাত্র-ছাত্রী)
                </p>
                <p className="text-3xl font-bold" style={{ color: "#004A99" }}>
                  ৫০০ টাকা
                </p>
                <p className="text-sm text-zinc-600">(জনপ্রতি)</p>
              </div>
              <div className="p-5">
                <p className="mb-3 text-sm font-semibold text-zinc-800">সুবিধাসমূহ:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FacilityItem icon={IconCoffee} label="চা/কফি" />
                  <FacilityItem icon={IconUtensils} label="দুপুরের খাবার" />
                  <FacilityItem icon={IconCookie} label="নাশতা" />
                  <FacilityItem icon={IconShirt} label="টি-শার্ট" />
                  <FacilityItem icon={IconGift} label="লটারি ও আকর্ষণীয় পুরস্কার" />
                  <FacilityItem icon={IconMic} label="সাংস্কৃতিক অনুষ্ঠান" />
                </div>
              </div>
            </div>
          </article>

          {/* Spouse / children */}
          <article
            className="overflow-hidden rounded-2xl border-2 bg-white shadow-sm"
            style={{ borderColor: "#F37021" }}
          >
            <div className="grid sm:grid-cols-[minmax(0,11rem)_1fr]">
              <div className="flex flex-col justify-center gap-1 border-b p-5 sm:border-b-0 sm:border-e" style={{ borderColor: "#F3702118", background: "#F3702108" }}>
                <p className="text-sm font-semibold leading-snug" style={{ color: "#F37021" }}>
                  অ্যালামনাইর স্পাউস/সন্তান
                </p>
                <p className="text-3xl font-bold" style={{ color: "#F37021" }}>
                  ৩৫০ টাকা
                </p>
                <p className="text-sm text-zinc-600">(জনপ্রতি) (৫ বছর ও তদুর্ধ্ব)</p>
              </div>
              <div className="p-5">
                <p className="mb-3 text-sm font-semibold text-zinc-800">সুবিধাসমূহ:</p>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <FacilityItem icon={IconCoffee} label="চা/কফি" />
                  <FacilityItem icon={IconUtensils} label="দুপুরের খাবার" />
                  <FacilityItem icon={IconCookie} label="নাশতা" />
                  <FacilityItem icon={IconMic} label="সাংস্কৃতিক অনুষ্ঠান" />
                </div>
              </div>
            </div>
          </article>

          {/* Children 0–5 */}
          <article
            className="overflow-hidden rounded-2xl border-2 bg-white shadow-sm"
            style={{ borderColor: "#8E24AA" }}
          >
            <div className="grid sm:grid-cols-[minmax(0,11rem)_1fr]">
              <div className="flex flex-col justify-center gap-1 border-b p-5 sm:border-b-0 sm:border-e" style={{ borderColor: "#8E24AA18", background: "#8E24AA08" }}>
                <p className="text-sm font-semibold leading-snug" style={{ color: "#8E24AA" }}>
                  অ্যালামনাইয়ের শিশু (০-৫ বছর)
                </p>
                <p className="text-2xl font-bold sm:text-3xl" style={{ color: "#8E24AA" }}>
                  সম্পূর্ণ বিনামূল্যে
                </p>
                <p className="text-sm text-zinc-600">রেজিস্ট্রেশন ফি প্রযোজ্য নয়</p>
              </div>
              <div className="p-5">
                <p className="mb-3 text-sm font-semibold text-zinc-800">বিশেষ সুবিধা:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FacilityItem icon={IconBaby} label="মা ও শিশু যত্ন কক্ষ" />
                  <FacilityItem icon={IconDoor} label="শিশু যত্ন কক্ষ" />
                  <FacilityItem icon={IconSparkles} label="মহিলাদের নামাজ কক্ষ" />
                  <FacilityItem icon={IconDoor} label="মহিলাদের বিশ্রাম ও ওয়াশরুম" />
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-8">
          <SectionBar>
            নিবন্ধন সময়কাল: ১৯ এপ্রিল, ২০২৬ (রবিবার) থেকে ০৭ মে, ২০২৬ (বৃহস্পতিবার)
          </SectionBar>
        </div>

        <div
          className="mt-6 rounded-2xl border-2 px-4 py-4 text-sm leading-relaxed"
          style={{ borderColor: "#e57373", background: "#ffebee" }}
        >
          <span className="font-semibold text-red-800">বিশেষ দ্রষ্টব্য: </span>
          <span className="text-red-900">
            টি-শার্ট সাইজ অনুযায়ী আগাম প্রস্তুত করতে হবে বিধায়, ০৭ মে ২০২৬ এর পরে নিবন্ধন করলে টি-শার্ট প্রদান সম্ভব হবে না
          </span>
        </div>

        <div
          className="mt-6 rounded-2xl border-2 border-sky-300 bg-sky-50/80 px-4 py-5"
        >
          <h2 className="mb-3 text-base font-bold" style={{ color: "#004A99" }}>
            গুরুত্বপূর্ণ তথ্য
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-800">
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#F37021" }} aria-hidden />
              <span>সকল অ্যালামনাই তাদের নিজ নিজ ব্যাচ প্রতিনিধির মাধ্যমে নিবন্ধন করতে পারবেন।</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#F37021" }} aria-hidden />
              <span>ব্যাচ প্রতিনিধিদের তালিকা খুব শীঘ্রই আমাদের পেজে শেয়ার করা হবে।</span>
            </li>
          </ul>
        </div>

        <nav className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-8 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            সাইন ইন
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium text-white shadow-sm hover:opacity-95"
            style={{ backgroundColor: "#004A99" }}
          >
            ড্যাশবোর্ড
          </Link>
          <Link
            href="/participants/new"
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium text-white shadow-sm hover:opacity-95"
            style={{ backgroundColor: "#F37021" }}
          >
            নতুন অংশগ্রহণকারী
          </Link>
        </nav>
      </main>
    </div>
  );
}
