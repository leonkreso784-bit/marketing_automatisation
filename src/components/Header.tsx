"use client";

import Link from "next/link";
import type { Lang } from "@/lib/schemas";
import { t } from "@/lib/i18n";

export function Header({ lang, setLang, children }: { lang: Lang; setLang?: (l: Lang) => void; children?: React.ReactNode }) {
  return (
    <header className="no-print mx-auto flex max-w-7xl items-center gap-4 px-5 py-5 md:px-8">
      <Link href="/" className="flex items-baseline gap-3">
        <span className="font-display text-xl font-bold tracking-tight">
          Stage<span className="font-normal">Media</span>
        </span>
        <span className="hidden text-sm text-ink/55 sm:inline">{t[lang].tagline}</span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        {children}
        {setLang && (
          <div role="group" aria-label="Language" className="flex rounded-full border border-ink/20 p-0.5 text-sm">
            {(["hr", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-full px-3 py-1 ${lang === l ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
