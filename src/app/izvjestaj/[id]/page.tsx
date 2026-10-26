/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PrintButton } from "@/components/PrintButton";
import { ReportView } from "@/components/ReportView";
import { t } from "@/lib/i18n";
import { ReportSchema } from "@/lib/schemas";

// Reads a freshly written report file on every request.
export const instant = false;

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]+$/i.test(id)) notFound();
  let raw: string;
  try {
    raw = await readFile(path.join(process.cwd(), "reports", `${id}.json`), "utf8");
  } catch {
    notFound();
  }
  const report = ReportSchema.parse(JSON.parse(raw));
  const d = t[report.lang];

  return (
    <div className="min-h-screen">
      <Header lang={report.lang}>
        <PrintButton label={d.pdf} />
      </Header>
      <main className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <div className="mb-12 flex items-center gap-4 pt-4">
          {report.site.images[0] && <img src={report.site.images[0]} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-lg object-cover" />}
          <div className="min-w-0">
            <p className="truncate font-display text-4xl font-semibold">{report.brand.businessName}</p>
            <p className="truncate text-sm text-ink/55">
              {report.site.url}
              {report.source === "mcp" && <span className="ml-3 rounded-full bg-sea/10 px-2 py-0.5 text-sea-deep">{d.mcpBadge}</span>}
            </p>
          </div>
        </div>
        <ReportView report={report} d={d} />
      </main>
    </div>
  );
}
