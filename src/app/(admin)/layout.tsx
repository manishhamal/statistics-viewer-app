import type { Metadata } from "next";
import "../globals.css";
import SiteHeader, { SiteFooter } from "@/components/SiteHeader";

// Root layout for the curator area (/admin). The curator tools are English-only;
// the public-site links in the header go to the English site.
export const metadata: Metadata = { title: "Nepal Stats — Curator", robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#f5f6f0] text-[#10283f]">
        <SiteHeader lang="en" />
        <main className="flex-1">{children}</main>
        <SiteFooter lang="en" />
      </body>
    </html>
  );
}
