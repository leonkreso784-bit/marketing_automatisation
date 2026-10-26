import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import {
  AdsSchema,
  BrandSchema,
  PlanSchema,
  PostsSchema,
  SeoAiSchema,
  type Brand,
  type Lang,
  type SeoCheck,
  type Site,
} from "./schemas";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
const EFFORT = (process.env.CLAUDE_EFFORT ?? "low") as "low" | "medium" | "high";

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const SYSTEM = `You are the senior strategist at StageMedia, a marketing agency from Opatija, Croatia (social media, paid ads, web & SEO).
You turn raw information about a client's business into concrete, ready-to-use marketing work.
Rules:
- Be specific to THIS business: use real names, places, offers and details from the website. Never write generic filler.
- Think about the local context (Kvarner, Opatija, tourism seasonality, domestic + foreign guests) when it is relevant to the business.
- Write like a sharp human copywriter, not like an AI. No clichés like "unlock", "elevate", "discover the magic".
- Everything you write must be usable as-is by the agency tomorrow morning.`;

function langLine(lang: Lang) {
  return lang === "hr"
    ? "Write ALL output text in Croatian (hrvatski), natural and fluent. Day labels like 'Pon 1', 'Uto 2'."
    : "Write ALL output text in English. Day labels like 'Mon 1', 'Tue 2'.";
}

function siteBlock(site: Site) {
  return `<website url="${site.url}">
<title>${site.title}</title>
<meta_description>${site.metaDescription}</meta_description>
<headings>${site.headings.join(" | ")}</headings>
<social_profiles>${site.socials.join(", ") || "none found"}</social_profiles>
<page_text>
${site.text}
</page_text>
</website>`;
}

function brandBlock(brand: Brand) {
  return `<brand_analysis>\n${JSON.stringify(brand, null, 2)}\n</brand_analysis>`;
}

async function ask<T extends z.ZodType>(schema: T, prompt: string): Promise<z.infer<T>> {
  const res = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: EFFORT, format: zodOutputFormat(schema) },
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "refusal") throw new Error("Model declined the request");
  if (!res.parsed_output) throw new Error("Could not parse model output");
  return res.parsed_output as z.infer<T>;
}

export function analyzeBrand(site: Site, lang: Lang) {
  return ask(
    BrandSchema,
    `${siteBlock(site)}

Analyse this business as if you are preparing for a pitch meeting with them.
Give: business name, one-liner, industry, location, 3 target audience segments, tone of voice (4-5 adjectives), 3-4 USPs, and 3 concrete marketing opportunities they are currently missing (based on what you see or don't see on the site).
${langLine(lang)}`,
  );
}

export function seoAdvice(site: Site, brand: Brand, checks: SeoCheck[], score: number, lang: Lang) {
  return ask(
    SeoAiSchema,
    `${siteBlock(site)}
${brandBlock(brand)}
<technical_seo_audit score="${score}/100">
${checks.map((c) => `- ${c.pass ? "PASS" : "FAIL"} ${c.label}: ${c.detail}`).join("\n")}
</technical_seo_audit>

Write a short SEO summary (2 sentences), then 5 prioritised recommendations (issue, exact fix, impact). Base them on the failed checks AND on content/local SEO opportunities (Google Business Profile, local keywords, multilingual pages for tourists, etc.).
Then write an improved <title> (max 60 chars) and meta description (max 155 chars), and 8 keywords real people would search for.
${langLine(lang)}`,
  );
}

export function contentPlan(site: Site, brand: Brand, lang: Lang) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return ask(
    PlanSchema,
    `${brandBlock(brand)}
<website_headings>${site.headings.join(" | ")}</website_headings>
<today>${today}</today>

Build a 2-week social media content plan starting next Monday. Take the current season and upcoming holidays/events into account.
Give a short strategy, 3-4 content pillars and exactly 10 plan items (mix of Instagram, Facebook, TikTok; mix of Reel, Carousel, Post, Story).
${langLine(lang)}`,
  );
}

export function writePosts(site: Site, brand: Brand, lang: Lang) {
  return ask(
    PostsSchema,
    `${siteBlock(site)}
${brandBlock(brand)}

Write 3 ready-to-publish social posts in the brand's tone of voice: one Instagram Reel, one Instagram Carousel, one Facebook Post.
Each: a scroll-stopping hook, the full caption (with line breaks and a few emojis where natural), 6-10 relevant hashtags (local + niche, without the # sign), a concrete visual idea for the designer/videographer, a CTA and the best time to post.
${langLine(lang)}`,
  );
}

export function writeAds(site: Site, brand: Brand, lang: Lang) {
  return ask(
    AdsSchema,
    `${siteBlock(site)}
${brandBlock(brand)}

Create 3 ad variants to A/B test: 2 for Meta (Facebook/Instagram) and 1 for Google Search. Each with a different creative angle.
Respect platform limits: Meta headline max 40 chars, Google headline max 30 chars, Google description max 90 chars.
For each: angle name, headline, primary text, description, CTA button text, a concrete targeting suggestion and a budget tip.
${langLine(lang)}`,
  );
}
