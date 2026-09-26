import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Idlefit", template: "%s · Idlefit" },
  description:
    "Design your product around the machines local shops already have running. Manufacturing paths, idle-capacity shop matches, and a pitch kit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted sm:px-6">
          Idlefit is a club MVP. Costs are estimates, and every shop listed is fictional demo data.
        </footer>
      </body>
    </html>
  );
}
