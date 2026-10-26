import { z } from "zod";

export const BrandSchema = z.object({
  businessName: z.string(),
  oneLiner: z.string().describe("One short sentence, max 20 words"),
  industry: z.string(),
  location: z.string(),
  audiences: z
    .array(z.object({ name: z.string().describe("max 6 words"), description: z.string().describe("1-2 sentences, max 35 words") }))
    .describe("3 target audience segments"),
  toneOfVoice: z.array(z.string()).describe("4-5 adjectives"),
  usps: z.array(z.string()).describe("3-4 unique selling points, max 15 words each"),
  opportunities: z
    .array(z.string())
    .describe("3 concrete marketing opportunities the business is missing, each 1-2 sentences, max 35 words"),
});

export const SeoAiSchema = z.object({
  summary: z.string().describe("max 2 sentences"),
  recommendations: z.array(
    z.object({
      issue: z.string().describe("max 12 words"),
      fix: z.string().describe("1-2 concrete sentences, max 40 words"),
      impact: z.enum(["high", "medium", "low"]),
    }),
  ),
  suggestedTitle: z.string(),
  suggestedMetaDescription: z.string(),
  keywords: z.array(z.string()).describe("8 keywords people would actually search"),
});

export const PlanSchema = z.object({
  strategy: z.string().describe("2-3 sentences on the content strategy for the next 2 weeks"),
  pillars: z.array(z.string()).describe("3-4 content pillars"),
  items: z.array(
    z.object({
      day: z.string().describe("e.g. 'Pon 1' / 'Mon 1'"),
      platform: z.enum(["Instagram", "Facebook", "TikTok", "LinkedIn"]),
      format: z.enum(["Reel", "Carousel", "Post", "Story"]),
      topic: z.string().describe("max 12 words"),
      goal: z.string().describe("max 10 words"),
    }),
  ),
});

export const PostsSchema = z.object({
  posts: z.array(
    z.object({
      platform: z.enum(["Instagram", "Facebook", "TikTok"]),
      format: z.enum(["Reel", "Carousel", "Post"]),
      hook: z.string().describe("First line that stops the scroll, max 10 words"),
      caption: z.string().describe("max 90 words"),
      hashtags: z.array(z.string()),
      visualIdea: z.string().describe("1-2 sentences, max 35 words"),
      cta: z.string(),
      bestTime: z.string().describe("e.g. 'Čet 19:30'"),
    }),
  ),
});

export const AdsSchema = z.object({
  ads: z.array(
    z.object({
      platform: z.enum(["Meta", "Google"]),
      angle: z.string().describe("Short name of the creative angle, max 5 words"),
      headline: z.string(),
      primaryText: z.string().describe("The ad body text the user sees. Meta: max 60 words. Google: one extra description line, max 90 chars"),
      description: z.string().describe("max 90 chars"),
      cta: z.string(),
      audience: z.string().describe("Targeting suggestion, 1-2 sentences, max 35 words"),
      budgetTip: z.string().describe("1 sentence, max 25 words"),
    }),
  ),
});

export const SeoCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  pass: z.boolean(),
  detail: z.string(),
});

export const SiteSchema = z.object({
  url: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  lang: z.string(),
  headings: z.array(z.string()),
  images: z.array(z.string()),
  logo: z.string().optional(),
  socials: z.array(z.string()),
  pagesRead: z.number(),
  wordCount: z.number(),
  text: z.string(),
});

export const ReportSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lang: z.enum(["hr", "en"]),
  source: z.enum(["web", "mcp", "demo"]),
  durationMs: z.number().optional(),
  site: SiteSchema.omit({ text: true }),
  seoScore: z.number(),
  seoChecks: z.array(SeoCheckSchema),
  brand: BrandSchema,
  seo: SeoAiSchema,
  plan: PlanSchema,
  posts: PostsSchema,
  ads: AdsSchema,
});

export type Brand = z.infer<typeof BrandSchema>;
export type SeoAi = z.infer<typeof SeoAiSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Posts = z.infer<typeof PostsSchema>;
export type Ads = z.infer<typeof AdsSchema>;
export type SeoCheck = z.infer<typeof SeoCheckSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type Lang = "hr" | "en";

export type StepId = "scrape" | "brand" | "seo" | "plan" | "posts" | "ads" | "done";

export type RunEvent =
  | { type: "step"; step: StepId; status: "running" | "done" | "error"; ms?: number; error?: string }
  | { type: "data"; key: keyof Report; value: unknown }
  | { type: "complete"; report: Report }
  | { type: "fatal"; error: string };
