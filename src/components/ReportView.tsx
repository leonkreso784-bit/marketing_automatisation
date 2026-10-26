/* eslint-disable @next/next/no-img-element */
import type { Dict } from "@/lib/i18n";
import type { Report } from "@/lib/schemas";

type Partial_ = Partial<Report>;

function Section({ title, aside, children, className = "" }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`reveal ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-ink/15 pb-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-mist" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

function host(url?: string) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return url ?? "";
  }
}

/* ---------- Brand ---------- */
function BrandBlock({ r, d }: { r: Partial_; d: Dict }) {
  const b = r.brand;
  if (!b) return <Skeleton lines={6} />;
  return (
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <div>
        <p className="font-display text-2xl leading-snug font-medium text-sea-deep">{b.oneLiner}</p>
        <p className="mt-2 text-sm text-ink/60">
          {b.industry} — {b.location}
        </p>
        <h3 className="mt-6 mb-2 font-semibold">{d.audiences}</h3>
        <ul className="space-y-3">
          {b.audiences.map((a) => (
            <li key={a.name} className="border-l-2 border-laurel pl-3">
              <span className="font-medium">{a.name}</span>
              <span className="block text-sm text-ink/70">{a.description}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 font-semibold">{d.tone}</h3>
          <div className="flex flex-wrap gap-2">
            {b.toneOfVoice.map((x) => (
              <span key={x} className="rounded-full border border-sea/30 px-3 py-1 text-sm text-sea-deep">
                {x}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">{d.usps}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {b.usps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-sun/20 p-4">
          <h3 className="mb-2 font-semibold">{d.opportunities}</h3>
          <ul className="space-y-2 text-sm">
            {b.opportunities.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- SEO ---------- */
function Gauge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--color-laurel)" : score >= 55 ? "var(--color-sun)" : "var(--color-flag)";
  const c = 2 * Math.PI * 52;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`${score}/100`}>
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-mist)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="68" textAnchor="middle" className="font-display" fontSize="30" fontWeight="600" fill="currentColor">
        {score}
      </text>
    </svg>
  );
}

function SeoBlock({ r, d }: { r: Partial_; d: Dict }) {
  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr]">
      {r.seoScore === null ? (
        <p className="rounded-lg bg-sun/20 p-4 text-sm md:col-span-2">{d.seoUnavailable}</p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1">
            {r.seoScore !== undefined ? <Gauge score={r.seoScore} /> : <div className="h-32 w-32 animate-pulse rounded-full bg-mist" />}
            <span className="text-sm text-ink/60">{d.seoScore}</span>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">{d.checks}</h3>
            {r.seoChecks ? (
              <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {r.seoChecks.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs text-white ${c.pass ? "bg-laurel" : "bg-flag"}`}
                      aria-label={c.pass ? "OK" : "!"}
                    >
                      {c.pass ? "✓" : "!"}
                    </span>
                    <span>{d.checkLabels[c.id] ?? c.label}</span>
                    <span className="ml-auto text-ink/50 tabular-nums">{c.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Skeleton />
            )}
          </div>
        </>
      )}

      <div className="md:col-span-2">
        {r.seo ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-ink/80">{r.seo.summary}</p>
              <h3 className="mb-2 font-semibold">{d.recommendations}</h3>
              <ol className="space-y-3">
                {r.seo.recommendations.map((x, i) => (
                  <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-x-2 text-sm">
                    <span className="font-display text-lg leading-none text-sea">{i + 1}</span>
                    <div>
                      <span className="font-medium">{x.issue}</span>
                      <span
                        className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                          x.impact === "high" ? "bg-flag/15 text-flag" : x.impact === "medium" ? "bg-sun/25 text-ink" : "bg-mist text-ink/70"
                        }`}
                      >
                        {d.impact[x.impact]}
                      </span>
                      <p className="text-ink/70">{x.fix}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">{d.newTitle}</h3>
              <div className="rounded-lg border border-mist bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-ink/70">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-mist text-[10px]">{host(r.site?.url).slice(0, 1).toUpperCase()}</span>
                  <span>
                    {host(r.site?.url)}
                    <span className="block text-ink/50">{r.site?.url}</span>
                  </span>
                </div>
                <p className="mt-2 text-lg leading-snug text-[#1a0dab]">{r.seo.suggestedTitle}</p>
                <p className="text-sm text-ink/70">{r.seo.suggestedMetaDescription}</p>
              </div>
              <h3 className="mt-6 mb-2 font-semibold">{d.keywords}</h3>
              <div className="flex flex-wrap gap-2">
                {r.seo.keywords.map((k) => (
                  <span key={k} className="rounded bg-sea/10 px-2 py-1 text-sm text-sea-deep">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Skeleton lines={5} />
        )}
      </div>
    </div>
  );
}

/* ---------- Plan ---------- */
const platformColor: Record<string, string> = {
  Instagram: "bg-[#c13584]",
  Facebook: "bg-[#1877f2]",
  TikTok: "bg-ink",
  LinkedIn: "bg-[#0a66c2]",
};

function PlanBlock({ r, d }: { r: Partial_; d: Dict }) {
  const p = r.plan;
  if (!p) return <Skeleton lines={5} />;
  return (
    <div>
      <p className="max-w-3xl text-ink/80">{p.strategy}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink/60">{d.pillars}:</span>
        {p.pillars.map((x) => (
          <span key={x} className="rounded-full bg-laurel/15 px-3 py-1 text-laurel">
            {x}
          </span>
        ))}
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {p.items.map((it, i) => (
          <li key={i} className="flex flex-col rounded-lg border border-mist bg-white p-3">
            <span className="font-display font-semibold">{it.day}</span>
            <span className={`mt-1 self-start rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white ${platformColor[it.platform]}`}>
              {it.platform} · {it.format}
            </span>
            <p className="mt-2 text-sm leading-snug font-medium">{it.topic}</p>
            <p className="mt-auto pt-2 text-xs text-ink/55">{it.goal}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Posts ---------- */
function PostsBlock({ r, d }: { r: Partial_; d: Dict }) {
  const posts = r.posts?.posts;
  if (!posts) return <Skeleton lines={6} />;
  const images = r.site?.images ?? [];
  const name = r.brand?.businessName ?? host(r.site?.url);
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {posts.map((p, i) => {
        const img = images[i % Math.max(images.length, 1)];
        const fb = p.platform === "Facebook";
        return (
          <article key={i} className="overflow-hidden rounded-2xl border border-mist bg-white shadow-sm">
            <header className="flex items-center gap-2 px-3 py-2">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${fb ? "bg-[#1877f2]" : "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"}`}>
                {name.slice(0, 1)}
              </span>
              <span className="text-sm font-semibold">{fb ? name : handle}</span>
              <span className="ml-auto text-xs text-ink/50">
                {p.platform} · {p.format}
              </span>
            </header>
            {fb && <p className="px-3 pb-2 text-sm whitespace-pre-line">{p.caption}</p>}
            <div className="relative aspect-square bg-sea-deep">
              {img ? (
                <img src={img} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : null}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4">
                <p className="font-display text-xl leading-tight font-semibold text-white">{p.hook}</p>
              </div>
              {p.format === "Carousel" && (
                <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">1/5</span>
              )}
              {p.format === "Reel" && (
                <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">▶ Reel</span>
              )}
            </div>
            <div className="space-y-2 p-3 text-sm">
              {!fb && (
                <p className="whitespace-pre-line">
                  <span className="font-semibold">{handle}</span> {p.caption}
                </p>
              )}
              <p className="text-sea">{p.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p>
              <div className="mt-3 space-y-1 border-t border-mist pt-3 text-xs text-ink/70">
                <p>
                  <span className="font-semibold text-ink">{d.visual}:</span> {p.visualIdea}
                </p>
                <p>
                  <span className="font-semibold text-ink">CTA:</span> {p.cta} — <span className="font-semibold text-ink">{d.bestTime}:</span> {p.bestTime}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ---------- Ads ---------- */
function AdsBlock({ r, d }: { r: Partial_; d: Dict }) {
  const ads = r.ads?.ads;
  if (!ads) return <Skeleton lines={6} />;
  const img = r.site?.images?.[1] ?? r.site?.images?.[0];
  const name = r.brand?.businessName ?? host(r.site?.url);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {ads.map((a, i) => (
        <div key={i} className="flex flex-col">
          <p className="mb-2 text-sm">
            <span className="font-display font-semibold">{a.angle}</span>
            <span className="text-ink/50"> — {a.platform}</span>
          </p>
          {a.platform === "Google" ? (
            <div className="rounded-xl border border-mist bg-white p-4 shadow-sm">
              <p className="text-xs">
                <span className="font-semibold">{d.sponsored}</span>
                <span className="block text-ink/60">{r.site?.url}</span>
              </p>
              <p className="mt-1 text-lg leading-snug text-[#1a0dab]">{a.headline}</p>
              <p className="text-sm text-ink/70">{a.description}</p>
              <p className="mt-2 text-sm text-ink/80">{a.primaryText}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-mist bg-white shadow-sm">
              <div className="flex items-center gap-2 p-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1877f2] text-xs font-bold text-white">{name.slice(0, 1)}</span>
                <span className="text-sm leading-tight">
                  <span className="font-semibold">{name}</span>
                  <span className="block text-xs text-ink/50">{d.sponsored}</span>
                </span>
              </div>
              <p className="px-3 pb-3 text-sm whitespace-pre-line">{a.primaryText}</p>
              {img && <img src={img} alt="" className="aspect-[1.91/1] w-full object-cover" referrerPolicy="no-referrer" />}
              <div className="flex items-center gap-3 bg-stone p-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink/50 uppercase">{host(r.site?.url)}</p>
                  <p className="truncate font-semibold">{a.headline}</p>
                  <p className="truncate text-xs text-ink/60">{a.description}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-md bg-mist px-3 py-1.5 text-sm font-semibold">{a.cta}</span>
              </div>
            </div>
          )}
          <dl className="mt-3 space-y-1 text-xs text-ink/70">
            <div>
              <dt className="inline font-semibold text-ink">{d.audience}: </dt>
              <dd className="inline">{a.audience}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">{d.budget}: </dt>
              <dd className="inline">{a.budgetTip}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

function SourcesBlock({ r, d }: { r: Partial_; d: Dict }) {
  if (!r.sources?.length) return null;
  return (
    <Section title={d.sources}>
      <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {r.sources.map((s) => (
          <li key={s.url} className="min-w-0">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sea hover:underline">
              {s.title || s.url}
            </a>
            <span className="block truncate text-xs text-ink/45">{host(s.url)}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function ReportView({ report, d }: { report: Partial_; d: Dict }) {
  const read = report.site?.pagesRead ? d.pagesRead(report.site.pagesRead, report.site.wordCount) : "";
  return (
    <div className="space-y-14">
      <Section title={d.brand} aside={read && <span className="text-sm text-ink/50">{read}</span>}>
        <BrandBlock r={report} d={d} />
      </Section>
      <Section title={d.seo}>
        <SeoBlock r={report} d={d} />
      </Section>
      <Section title={d.plan}>
        <PlanBlock r={report} d={d} />
      </Section>
      <Section title={d.posts}>
        <PostsBlock r={report} d={d} />
      </Section>
      <Section title={d.ads}>
        <AdsBlock r={report} d={d} />
      </Section>
      <SourcesBlock r={report} d={d} />
    </div>
  );
}
