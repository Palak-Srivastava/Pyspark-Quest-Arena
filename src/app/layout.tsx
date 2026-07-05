import type { Metadata } from "next";

import "./globals.css";

import { Navbar } from "@/components/navbar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Spark Practice Arena | PySpark Interview Questions",
    template: "%s | Spark Practice Arena",
  },
  description:
    "Practice PySpark with interview-style questions, timed coding challenges, leaderboards, and community discussions.",
  keywords: [
    "spark practice",
    "pyspark practice",
    "spark interview questions",
    "pyspark coding challenges",
    "data engineering interview prep",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Spark Quest Arena | PySpark Coding Practice",
    description:
      "Interactive PySpark practice platform with company-tagged problems, coding arena, and discussion support.",
    url: siteUrl,
    siteName: "Spark Quest Arena",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Spark Quest Arena — Interactive PySpark Coding Practice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spark Quest Arena | PySpark Coding Practice",
    description: "Practice PySpark with structured interview questions and coding challenges.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#08101c] text-slate-100 antialiased">
        <div className="grid-mask pointer-events-none fixed inset-0" />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,180,70,.12),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(82,158,255,.18),transparent_32%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,.08),transparent_28%)]" />
        <div className="grain-overlay" />
        <div className="relative">
          <Navbar />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
