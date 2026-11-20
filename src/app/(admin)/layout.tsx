import type { Metadata } from "next";
import "../globals.css";
import SiteHeader, { SiteFooter } from "@/components/SiteHeader";
import ThemeScript from "@/components/ThemeScript";

// Root layout for the curator area (/admin). The curator tools are English-only;
// the public-site links in the header go to the English site.
export const metadata: Metadata = { title: "Nepal Stats — Curator", robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen flex flex-col bg-paper text-ink">
        <SiteHeader lang="en" />
        <main className="flex-1">{children}</main>
        <SiteFooter lang="en" />
      </body>
    </html>
  );
}
