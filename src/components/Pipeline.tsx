import type { Dict } from "@/lib/i18n";
import type { StepId } from "@/lib/schemas";

export type StepState = { status: "idle" | "running" | "done" | "error"; ms?: number; error?: string };

const PARALLEL: StepId[] = ["seo", "plan", "posts", "ads"];

function fmt(ms?: number) {
  if (ms === undefined) return "";
  return `${(ms / 1000).toFixed(1)} s`;
}

export function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Dot({ s }: { s: StepState }) {
  if (s.status === "done")
    return <span className="grid h-6 w-6 place-items-center rounded-full bg-laurel text-xs text-white">✓</span>;
  if (s.status === "running")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-sun">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink border-t-transparent" />
      </span>
    );
  if (s.status === "error") return <span className="grid h-6 w-6 place-items-center rounded-full bg-flag text-xs text-white">!</span>;
  return <span className="h-6 w-6 rounded-full border-2 border-ink/20 bg-white" />;
}

function Row({ id, s, d }: { id: StepId; s: StepState; d: Dict }) {
  const [title, sub] = d.steps[id];
  return (
    <div className="flex items-start gap-3">
      <Dot s={s} />
      <div className="min-w-0 flex-1">
        <p className={`leading-6 font-medium ${s.status === "idle" ? "text-ink/45" : ""}`}>{title}</p>
        {sub && <p className="text-xs text-ink/50">{s.error ?? sub}</p>}
      </div>
      <span className="text-xs text-ink/50 tabular-nums">{fmt(s.ms)}</span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return <div className={`ml-[11px] h-5 w-0.5 ${active ? "flow-line" : "bg-ink/15"}`} />;
}

export function Pipeline({ steps, d, elapsed, finished }: { steps: Record<StepId, StepState>; d: Dict; elapsed: number; finished: boolean }) {
  const parallelActive = PARALLEL.some((p) => steps[p].status === "running");
  return (
    <div>
      <Row id="scrape" s={steps.scrape} d={d} />
      <Connector active={steps.scrape.status === "running" || steps.brand.status === "running"} />
      <Row id="brand" s={steps.brand} d={d} />
      <Connector active={parallelActive} />
      <div className={`space-y-3 rounded-lg border-l-2 py-1 pl-3 ${parallelActive ? "border-sun" : "border-ink/15"}`}>
        {PARALLEL.map((id) => (
          <Row key={id} id={id} s={steps[id]} d={d} />
        ))}
      </div>
      <Connector active={false} />
      <Row id="done" s={steps.done} d={d} />

      <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-ink/15 pt-4">
        <div>
          <dt className="text-xs text-ink/55">{d.manual}</dt>
          <dd className="font-display text-2xl text-ink/45 line-through decoration-flag/70">{d.manualValue}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">{d.automated}</dt>
          <dd className={`font-display text-2xl font-semibold tabular-nums ${finished ? "text-laurel" : ""}`}>{clock(elapsed)}</dd>
        </div>
      </dl>
    </div>
  );
}
