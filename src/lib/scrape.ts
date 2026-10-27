import dns, { type LookupAddress } from "node:dns";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import ipaddr from "ipaddr.js";
import { Agent, fetch, type Response } from "undici";
import type { Site } from "./schemas";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

const SUBPAGE_HINTS =
  /(o-nama|about|usluge|services|ponuda|offer|smjestaj|accommodation|rooms|sobe|menu|jelovnik|restaurant|restoran)/i;

export interface RawPage {
  url: string;
  html: string;
}

/** True when the input looks like a web address rather than a business name. */
export function looksLikeUrl(input: string): boolean {
  const s = input.trim();
  if (/^https?:\/\//i.test(s)) return true;
  return !/\s/.test(s) && /^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(s);
}

/** Normalises a pasted link: adds https, drops ad-tracking query strings and #fragments. */
export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid URL");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

/** Short, human-readable reason a site could not be read. */
export class ScrapeError extends Error {
  constructor(public reason: "blocked" | "notfound" | "unreachable" | "notallowed" | "nothtml", detail: string) {
    super(detail);
  }
}

// Only public (global unicast) addresses are allowed. IPv4-mapped IPv6 is unwrapped
// first; every other special range (private, loopback, link-local, NAT64, 6to4...) is denied.
function isPublicIp(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  return ipaddr.process(ip).range() === "unicast";
}

// Runs inside the connection itself, so the address we check is the address we connect to
// (no gap for DNS rebinding between checking and fetching).
function safeLookup(
  hostname: string,
  options: dns.LookupOptions,
  cb: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return cb(err, "");
    if (addrs.length === 0 || !addrs.every((a) => isPublicIp(a.address))) {
      return cb(Object.assign(new Error(`Address not allowed: ${hostname}`), { code: "EBLOCKED" }), "");
    }
    if (options.all) cb(null, addrs);
    else cb(null, addrs[0].address, addrs[0].family);
  });
}

const agent = new Agent({ connect: { lookup: safeLookup as never } });

function assertAllowedUrl(url: string) {
  const { hostname, protocol, port } = new URL(url);
  if (!["http:", "https:"].includes(protocol)) throw new ScrapeError("notallowed", "Invalid URL");
  if (port && !["80", "443"].includes(port)) throw new ScrapeError("notallowed", `Port not allowed: ${port}`);
  const host = hostname.replace(/^\[|\]$/g, "");
  // IP literals skip DNS lookup, so check them here.
  if (isIP(host) && !isPublicIp(host)) throw new ScrapeError("notallowed", `Address not allowed: ${hostname}`);
}

async function fetchHtml(url: string): Promise<string> {
  let current = url;
  let res: Response | undefined;
  for (let hop = 0; hop < 5; hop++) {
    assertAllowedUrl(current);
    try {
      res = await fetch(current, {
        headers: { "user-agent": UA, "accept-language": "hr,en;q=0.8" },
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        dispatcher: agent,
      });
    } catch (err) {
      const cause = (err as { cause?: Error }).cause;
      if (cause?.message?.startsWith("Address not allowed")) throw new ScrapeError("notallowed", cause.message);
      throw new ScrapeError("unreachable", `Could not load ${new URL(current).hostname}`);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    break;
  }
  if (!res || (res.status >= 300 && res.status < 400)) throw new ScrapeError("unreachable", `Too many redirects for ${url}`);
  if (res.status === 404 || res.status === 410) throw new ScrapeError("notfound", `HTTP ${res.status}`);
  if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 400) throw new ScrapeError("blocked", `HTTP ${res.status}`);
  if (!res.ok) throw new ScrapeError("unreachable", `HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new ScrapeError("nothtml", "Not an HTML page");
  return await readCapped(res);
}

const MAX_BYTES = 3 * 1024 * 1024;

async function readCapped(res: Response): Promise<string> {
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new ScrapeError("unreachable", "Page is too large");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break; // keep what we have; the start of the page is what matters
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function abs(base: string, href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

function pageText($: cheerio.CheerioAPI): string {
  $("script, style, noscript, svg, iframe").remove();
  const full = $("body").text().replace(/\s+/g, " ").trim();
  // Menus and footers repeat on every subpage; drop them unless the site puts its content there.
  $("nav, footer, [role=navigation]").remove();
  const main = $("body").text().replace(/\s+/g, " ").trim();
  return main.split(" ").length >= 150 ? main : full;
}

export async function scrapeSite(input: string): Promise<{ site: Site; home: RawPage }> {
  let url = normalizeUrl(input);
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    // A deep link that fails (404, moved) often still has a readable home page.
    const origin = new URL(url).origin + "/";
    if (url === origin || (err instanceof ScrapeError && err.reason === "notallowed")) throw err;
    url = origin;
    html = await fetchHtml(url);
  }
  const home: RawPage = { url, html };
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const lang = $("html").attr("lang") ?? "";
  const headings = $("h1, h2")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((h) => h.length > 2 && h.length < 140)
    .slice(0, 20);

  const images = new Set<string>();
  const og = abs(url, $('meta[property="og:image"]').attr("content"));
  if (og) images.add(og);
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src") ?? $(el).attr("data-lazy-src");
    const a = abs(url, src);
    if (!a || a.startsWith("data:") || /\.svg(\?|$)/i.test(a) || /logo|icon|sprite|pixel|badge|best[_-]?price|award|flag/i.test(a)) return;
    const w = Number($(el).attr("width") ?? 0);
    if (w && w < 200) return;
    images.add(a);
  });

  const logo =
    abs(url, $('img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i]').first().attr("src")) ??
    abs(url, $('link[rel="apple-touch-icon"]').attr("href"));

  const socials = new Set<string>();
  $("a[href]").each((_, el) => {
    const h = $(el).attr("href") ?? "";
    if (/(instagram|facebook|tiktok|linkedin|youtube)\.com/i.test(h)) socials.add(h.split("?")[0]);
  });

  const subpages = new Set<string>();
  const origin = new URL(url).origin;
  $("a[href]").each((_, el) => {
    const a = abs(url, $(el).attr("href"));
    if (a && a.startsWith(origin) && SUBPAGE_HINTS.test(a) && a !== url) subpages.add(a.split("#")[0]);
  });

  let text = pageText($);
  let pagesRead = 1;
  for (const sp of [...subpages].slice(0, 2)) {
    try {
      const sub = cheerio.load(await fetchHtml(sp));
      text += "\n\n" + pageText(sub);
      pagesRead++;
    } catch {
      // subpages are a bonus; ignore failures
    }
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    home,
    site: {
      url,
      title,
      metaDescription,
      lang,
      headings,
      images: [...images].slice(0, 8),
      logo,
      socials: [...socials].slice(0, 6),
      pagesRead,
      wordCount,
      text: text.slice(0, 14000),
    },
  };
}
