import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin", "latin-ext"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "StageMedia · Marketinški autopilot",
  description: "Od web stranice do gotove kampanje u par minuta.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hr" className={`${bricolage.variable} ${figtree.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
