import { translateReport } from "@/lib/ai";
import { ReportSchema, type Lang } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  const code = process.env.ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return Response.json({ error: "Access code required" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { report?: unknown; lang?: Lang } | null;
  const parsed = ReportSchema.safeParse(body?.report);
  if (!body || !parsed.success || (body.lang !== "hr" && body.lang !== "en")) {
    return Response.json({ error: "Invalid report" }, { status: 400 });
  }
  const report = parsed.data;
  try {
    const { brand, seo, plan, posts, ads } = report;
    const out = await translateReport({ brand, seo, plan, posts, ads }, body.lang);
    return Response.json({ ...report, ...out, lang: body.lang });
  } catch (err) {
    console.error("[translate] failed:", err);
    return Response.json({ error: "Translation failed" }, { status: 502 });
  }
}
