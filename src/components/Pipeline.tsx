import type { Dict } from "@/lib/i18n";
import type { StepId } from "@/lib/schemas";

export type StepState = { status: "idle" | "running" | "done" | "error" | "skipped"; ms?: number; error?: string };

const GATHER: StepId[] = ["research", "scrape"];
const PARALLEL: StepId[] = ["seo", "plan", "posts", "ads"];
// A failed website read is not fatal: web research covers for it.
const SOFT_FAIL: StepId[] = ["scrape"];

function fmt(ms?: number) {
  if (ms === undefined) return "";
  return `${(ms / 1000).toFixed(1)} s`;
}

export function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Dot({ s, soft }: { s: StepState; soft: boolean }) {
  if (s.status === "done") return <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-laurel text-xs text-white">✓</span>;
  if (s.status === "running")
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink border-t-transparent" />
      </span>
    );
  if (s.status === "error" || s.status === "skipped")
    return soft ? (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun/60 text-xs">–</span>
    ) : (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-flag text-xs text-white">!</span>
    );
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-ink/20 bg-white" />;
}

function Row({ id, s, d }: { id: StepId; s: StepState; d: Dict }) {
  const [title, sub] = d.steps[id];
  const soft = SOFT_FAIL.includes(id) || s.status === "skipped";
  const note = s.status === "skipped" ? d.errors.skipped : s.error ? (d.errors[s.error] ?? d.errors.generic) : sub;
  return (
    <div className="flex items-start gap-3">
      <Dot s={s} soft={soft} />
      <div className="min-w-0 flex-1">
        <p className={`leading-6 font-medium ${s.status === "idle" ? "text-ink/45" : ""}`}>{title}</p>
        {note && <p className={`text-xs break-words ${s.error && !soft ? "text-flag" : "text-ink/50"}`}>{note}</p>}
      </div>
      <span className="text-xs text-ink/50 tabular-nums">{fmt(s.ms)}</span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return <div className={`ml-[11px] h-5 w-0.5 ${active ? "flow-line" : "bg-ink/15"}`} />;
}

function Group({ ids, steps, d }: { ids: StepId[]; steps: Record<StepId, StepState>; d: Dict }) {
  const active = ids.some((p) => steps[p].status === "running");
  return (
    <div className={`space-y-3 rounded-lg border-l-2 py-1 pl-3 ${active ? "border-sun" : "border-ink/15"}`}>
      {ids.map((id) => (
        <Row key={id} id={id} s={steps[id]} d={d} />
      ))}
    </div>
  );
}

export function Pipeline({
  steps,
  d,
  elapsed,
  finished,
  compact = false,
}: {
  steps: Record<StepId, StepState>;
  d: Dict;
  elapsed: number;
  finished: boolean;
  compact?: boolean;
}) {
  const gathering = GATHER.some((p) => steps[p].status === "running");
  const parallelActive = PARALLEL.some((p) => steps[p].status === "running");
  return (
    <div>
      <Group ids={GATHER} steps={steps} d={d} />
      <Connector active={gathering || steps.brand.status === "running"} />
      <Row id="brand" s={steps.brand} d={d} />
      <Connector active={parallelActive} />
      <Group ids={PARALLEL} steps={steps} d={d} />
      <Connector active={false} />
      <Row id="done" s={steps.done} d={d} />

      {!compact && (
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
      )}
    </div>
  );
}
