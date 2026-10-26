import * as cheerio from "cheerio";
import type { Lang, SeoCheck } from "./schemas";
import type { RawPage } from "./scrape";

type Check = { id: string; weight: number; hr: string; en: string; test: () => [boolean, string] };

export function auditSeo(page: RawPage, lang: Lang): { score: number; checks: SeoCheck[] } {
  const $ = cheerio.load(page.html);
  const title = $("title").first().text().trim();
  const desc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const h1s = $("h1").length;
  const imgs = $("img");
  const noAlt = imgs.filter((_, el) => !($(el).attr("alt") ?? "").trim()).length;
  const isHttps = page.url.startsWith("https://");

  const checks: Check[] = [
    {
      id: "title",
      weight: 15,
      hr: "Naslov stranice (title)",
      en: "Page title",
      test: () => [title.length >= 30 && title.length <= 65, `${title.length} / 30–65`],
    },
    {
      id: "meta",
      weight: 15,
      hr: "Meta opis",
      en: "Meta description",
      test: () => [desc.length >= 70 && desc.length <= 165, desc ? `${desc.length} / 70–165` : "—"],
    },
    {
      id: "h1",
      weight: 12,
      hr: "Jedan H1 naslov",
      en: "Single H1 heading",
      test: () => [h1s === 1, `${h1s} × H1`],
    },
    {
      id: "alt",
      weight: 12,
      hr: "Alt tekst na slikama",
      en: "Image alt text",
      test: () => [imgs.length === 0 || noAlt / imgs.length < 0.2, `${imgs.length - noAlt}/${imgs.length}`],
    },
    {
      id: "https",
      weight: 10,
      hr: "HTTPS",
      en: "HTTPS",
      test: () => [isHttps, isHttps ? "OK" : "HTTP"],
    },
    {
      id: "viewport",
      weight: 10,
      hr: "Prilagođeno mobitelu",
      en: "Mobile viewport",
      test: () => [$('meta[name="viewport"]').length > 0, $('meta[name="viewport"]').length ? "OK" : "—"],
    },
    {
      id: "og",
      weight: 8,
      hr: "Open Graph (dijeljenje na mrežama)",
      en: "Open Graph (social sharing)",
      test: () => {
        const ok = $('meta[property="og:title"]').length > 0 && $('meta[property="og:image"]').length > 0;
        return [ok, ok ? "OK" : "—"];
      },
    },
    {
      id: "lang",
      weight: 6,
      hr: "Oznaka jezika",
      en: "Language attribute",
      test: () => {
        const l = $("html").attr("lang");
        return [Boolean(l), l ?? ("—")];
      },
    },
    {
      id: "canonical",
      weight: 6,
      hr: "Canonical link",
      en: "Canonical link",
      test: () => [$('link[rel="canonical"]').length > 0, $('link[rel="canonical"]').length ? "OK" : "—"],
    },
    {
      id: "schema",
      weight: 6,
      hr: "Strukturirani podaci (Schema.org)",
      en: "Structured data (Schema.org)",
      test: () => {
        const n = $('script[type="application/ld+json"]').length;
        return [n > 0, n ? `${n}` : "—"];
      },
    },
  ];

  let score = 0;
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const out: SeoCheck[] = checks.map((c) => {
    const [pass, detail] = c.test();
    if (pass) score += c.weight;
    return { id: c.id, label: c[lang], pass, detail };
  });

  return { score: Math.round((score / total) * 100), checks: out };
}
