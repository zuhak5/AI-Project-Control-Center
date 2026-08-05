import { z } from "zod";

const envName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Z][A-Z0-9_]*$/, "Use an uppercase environment-variable name.");

const modelName = z.string().trim().min(1).max(160);

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  environment: z.enum(["development", "staging", "production", "other"]),
  provider: z.enum(["openai-responses", "anthropic-messages", "gemini-generate", "custom-json"]),
  enabled: z.boolean().default(true),
  baseUrl: z.string().trim().url().max(500),
  apiKeyEnv: envName,
  defaultModel: modelName,
  allowedModels: z.array(modelName).min(1).max(30),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  monthlyBudgetUsd: z.number().nonnegative().max(1_000_000).nullable().default(null),
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    prompt: z.string().trim().min(1).max(1000).default("Reply with exactly: OK"),
    expectedText: z.string().trim().max(200).default("OK"),
    timeoutMs: z.number().int().min(1000).max(120000).default(30000)
  }),
  telemetryEnabled: z.boolean().default(true)
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const playgroundSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  prompt: z.string().trim().min(1).max(20000),
  system: z.string().trim().max(10000).optional().default(""),
  model: modelName.optional(),
  maxOutputTokens: z.number().int().min(1).max(32000).default(800),
  temperature: z.number().min(0).max(2).optional()
});

export const telemetrySchema = z.object({
  timestamp: z.string().datetime().optional(),
  status: z.enum(["success", "error"]),
  statusCode: z.number().int().min(100).max(599).nullable().optional().default(null),
  model: z.string().trim().max(160).default("unknown"),
  latencyMs: z.number().int().nonnegative().max(3_600_000),
  inputTokens: z.number().int().nonnegative().max(100_000_000).default(0),
  outputTokens: z.number().int().nonnegative().max(100_000_000).default(0),
  estimatedCostUsd: z.number().nonnegative().max(1_000_000).default(0),
  requestId: z.string().trim().max(200).nullable().optional().default(null),
  errorCategory: z.string().trim().max(100).nullable().optional().default(null),
  note: z.string().trim().max(500).nullable().optional().default(null)
});

export function normalizeList(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";
}
