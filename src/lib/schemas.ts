import { z } from "zod";

export const BrandSchema = z.object({
  businessName: z.string(),
  oneLiner: z.string().describe("One sentence describing what the business is"),
  industry: z.string(),
  location: z.string(),
  audiences: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .describe("3 target audience segments"),
  toneOfVoice: z.array(z.string()).describe("4-5 adjectives"),
  usps: z.array(z.string()).describe("3-4 unique selling points"),
  opportunities: z
    .array(z.string())
    .describe("3 concrete marketing opportunities the business is missing"),
});

export const SeoAiSchema = z.object({
  summary: z.string(),
  recommendations: z.array(
    z.object({
      issue: z.string(),
      fix: z.string(),
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
      topic: z.string(),
      goal: z.string(),
    }),
  ),
});

export const PostsSchema = z.object({
  posts: z.array(
    z.object({
      platform: z.enum(["Instagram", "Facebook", "TikTok"]),
      format: z.enum(["Reel", "Carousel", "Post"]),
      hook: z.string().describe("First line that stops the scroll"),
      caption: z.string(),
      hashtags: z.array(z.string()),
      visualIdea: z.string(),
      cta: z.string(),
      bestTime: z.string(),
    }),
  ),
});

export const AdsSchema = z.object({
  ads: z.array(
    z.object({
      platform: z.enum(["Meta", "Google"]),
      angle: z.string().describe("Short name of the creative angle"),
      headline: z.string(),
      primaryText: z.string(),
      description: z.string(),
      cta: z.string(),
      audience: z.string().describe("Targeting suggestion"),
      budgetTip: z.string(),
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
