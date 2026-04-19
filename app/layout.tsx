import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KMLHSAA Alumni Day 2026 Registration",
  description:
    "খাজুরিয়া বহুমুখী উচ্চ বিদ্যালয় অ্যালামনাই অ্যাসোসিয়েশন (KMLHSAA) — অ্যালামনাই ডে ২০২৬ নিবন্ধন ফি, সময়কাল ও গুরুত্বপূর্ণ তথ্য।",
  openGraph: {
    title: "KMLHSAA Alumni Day 2026 | নিবন্ধন",
    description:
      "অ্যালামনাই ডে — লং প্রোগ্রাম ২০২৬ | অভিষেক ও ঈদ পুনর্মিলনী — নিবন্ধন ফি তালিকা ও সময়কাল।",
    locale: "bn_BD",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansBengali.variable} h-full antialiased`}
    >
      <body
        className={`min-h-full flex flex-col ${notoSansBengali.className}`}
      >
        {children}
      </body>
    </html>
  );
}
