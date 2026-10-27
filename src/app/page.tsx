"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Pipeline, type StepState } from "@/components/Pipeline";
import { ReportView } from "@/components/ReportView";
import { t } from "@/lib/i18n";
import type { Lang, Report, RunEvent, StepId } from "@/lib/schemas";

const STEP_IDS: StepId[] = ["research", "scrape", "brand", "seo", "plan", "posts", "ads", "done"];
const idle = () => Object.fromEntries(STEP_IDS.map((s) => [s, { status: "idle" }])) as Record<StepId, StepState>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function accessCode() {
  const fromLink = new URLSearchParams(window.location.search).get("kod");
  if (fromLink) localStorage.setItem("stagemedia-kod", fromLink);
  return localStorage.getItem("stagemedia-kod") ?? "";
}

export default function Home() {
  const [lang, setLangState] = useState<Lang>("hr");
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"start" | "running" | "done" | "error">("start");
  const [steps, setSteps] = useState(idle);
  const [report, setReport] = useState<Partial<Report>>({});
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [translateFailed, setTranslateFailed] = useState(false);
  const startRef = useRef(0);
  const d = t[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `StageMedia · ${t[lang].tagline}`;
  }, [lang]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [phase]);

  function handle(e: RunEvent) {
    if (e.type === "step") setSteps((s) => ({ ...s, [e.step]: { status: e.status, ms: e.ms, error: e.error } }));
    else if (e.type === "data") setReport((r) => ({ ...r, [e.key]: e.value }));
    else if (e.type === "complete") {
      setReport(e.report);
      setElapsed(e.report.durationMs ?? Date.now() - startRef.current);
      setPhase("done");
    } else if (e.type === "fatal") {
      setError(e.error);
      setPhase("error");
    }
  }

  function reset() {
    setSteps(idle());
    setReport({});
    setError("");
    setTranslateFailed(false);
    setElapsed(0);
    startRef.current = Date.now();
    setPhase("running");
  }

  // Switching language also switches the finished report, so the whole page is in one language.
  async function setLang(next: Lang) {
    const prev = lang;
    setLangState(next);
    setTranslateFailed(false);
    if (phase !== "done" || !report.lang || report.lang === next) return;
    const full = report as Report;
    setTranslating(true);
    try {
      if (full.source === "demo") {
        const res = await fetch(`/demo-report-${next}.json`);
        if (!res.ok) throw new Error("demo");
        setReport({ ...((await res.json()) as Report), durationMs: full.durationMs });
        return;
      }
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": accessCode() },
        body: JSON.stringify({ report: full, lang: next }),
      });
      if (!res.ok) throw new Error("translate");
      setReport((await res.json()) as Report);
    } catch {
      // Keep the page in one language: go back to the language the report is in.
      setLangState(prev);
      setTranslateFailed(true);
    } finally {
      setTranslating(false);
    }
  }

  async function run(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (!url.trim()) return;
    reset();
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": accessCode() },
        body: JSON.stringify({ url, lang }),
      });
      if (res.status === 401) throw new Error("access");
      if (!res.ok || !res.body) throw new Error("generic");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) handle(JSON.parse(line));
      }
    } catch (err) {
      setError((err as Error).message === "access" ? "access" : "generic");
      setPhase("error");
    }
  }

  // Replays a saved report with realistic timing, for when the network or API is unavailable.
  async function demo() {
    const res = await fetch(`/demo-report-${lang}.json`).catch(() => null);
    if (!res?.ok) {
      setError("generic");
      setPhase("error");
      return;
    }
    const saved = (await res.json()) as Report;
    setUrl(saved.site.url);
    reset();
    const step = async (id: StepId, ms: number, data: Partial<Report>) => {
      handle({ type: "step", step: id, status: "running" });
      await sleep(ms);
      handle({ type: "step", step: id, status: "done", ms });
      setReport((r) => ({ ...r, ...data }));
    };
    await Promise.all([
      step("research", 5200, { sources: saved.sources }),
      step("scrape", 1800, { site: saved.site, seoScore: saved.seoScore, seoChecks: saved.seoChecks }),
    ]);
    await step("brand", 6500, { brand: saved.brand });
    await Promise.all([
      step("seo", 7200, { seo: saved.seo }),
      step("plan", 9800, { plan: saved.plan }),
      step("posts", 11400, { posts: saved.posts }),
      step("ads", 8600, { ads: saved.ads }),
    ]);
    const total = Date.now() - startRef.current;
    handle({ type: "step", step: "done", status: "done", ms: total });
    handle({ type: "complete", report: { ...saved, durationMs: total } });
  }

  const started = phase !== "start";
  const errorText = error === "access" ? d.accessError : (d.errors[error] ?? d.errors.generic);

  return (
    <div className="min-h-screen">
      <Header lang={lang} setLang={phase === "running" || translating ? undefined : setLang}>
        {translating && <span className="animate-pulse text-sm text-ink/60">{d.translating}</span>}
        {translateFailed && !translating && <span className="text-sm text-flag">{d.translateError}</span>}
        {phase === "done" && !translating && (
          <button onClick={() => window.print()} className="rounded-full border border-ink/25 px-4 py-1.5 text-sm hover:bg-white">
            {d.pdf}
          </button>
        )}
      </Header>

      <main className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className={`no-print transition-all ${started ? "pt-2 pb-8" : "pt-16 pb-20 md:pt-28"}`}>
          {!started && (
            <div className="grid items-end gap-12 lg:grid-cols-[1fr_17rem]">
              <div>
                <h1 className="max-w-4xl font-display text-5xl leading-[1.02] font-semibold tracking-tight md:text-7xl">{d.heroTitle}</h1>
                <p className="mt-6 max-w-2xl text-lg text-ink/70">{d.heroSub}</p>
              </div>
              <div className="hidden rounded-2xl border border-ink/10 bg-white p-5 lg:block" aria-hidden>
                <Pipeline steps={steps} d={d} elapsed={0} finished={false} compact />
              </div>
            </div>
          )}
          <form onSubmit={run} className={`flex max-w-3xl flex-col gap-3 sm:flex-row ${started ? "" : "mt-10"}`}>
            <label className="sr-only" htmlFor="url">
              {d.placeholder}
            </label>
            <input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={d.placeholder}
              disabled={phase === "running"}
              className="min-w-0 flex-1 rounded-xl border-2 border-ink/15 bg-white px-5 py-4 text-lg outline-none focus:border-sea disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={phase === "running" || !url.trim()}
              className="rounded-xl bg-sea-deep px-6 py-4 text-lg font-semibold text-white hover:bg-sea disabled:opacity-50"
            >
              {phase === "running" ? d.running : d.run}
            </button>
          </form>
          {!started && (
            <button onClick={demo} className="mt-4 text-sm text-sea underline underline-offset-4 hover:text-sea-deep">
              {d.demo}
            </button>
          )}
        </div>

        {started && (
          <div className="grid gap-10 lg:grid-cols-[18rem_1fr]">
            <aside className="no-print lg:sticky lg:top-6 lg:self-start">
              <Pipeline steps={steps} d={d} elapsed={elapsed} finished={phase === "done"} />
              {phase !== "running" && (
                <button
                  onClick={() => {
                    setPhase("start");
                    setUrl("");
                    setSteps(idle());
                  }}
                  className="mt-6 text-sm text-sea underline underline-offset-4"
                >
                  {d.again}
                </button>
              )}
            </aside>

            <div className={`min-w-0 print-full ${translating ? "opacity-50" : ""}`}>
              {phase === "error" && (
                <div role="alert" className="mb-8 rounded-lg border border-flag/40 bg-flag/10 p-4">
                  <p className="font-semibold text-flag">{d.error}</p>
                  <p className="text-sm break-words">{errorText}</p>
                </div>
              )}
              {report.site && (
                <div className="mb-10 flex items-center gap-4">
                  {report.site.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={report.site.images[0]} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-display text-3xl font-semibold">{report.brand?.businessName ?? report.site.title}</p>
                    {report.site.url && <p className="truncate text-sm text-ink/55">{report.site.url}</p>}
                  </div>
                </div>
              )}
              {phase !== "error" && <ReportView report={report} d={d} />}
            </div>
          </div>
        )}
      </main>
      <footer className="no-print mx-auto max-w-7xl px-5 pb-8 text-sm text-ink/45 md:px-8">{d.footer}</footer>
    </div>
  );
}
