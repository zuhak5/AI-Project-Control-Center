import { z } from "zod";

export const playgroundSchema = z.object({
  prompt: z.string().trim().min(1).max(20000),
  system: z.string().trim().max(10000).optional().default(""),
  maxOutputTokens: z.number().int().min(1).max(8000).default(800),
  temperature: z.number().min(0).max(2).optional()
});

export const settingsSchema = z.object({
  healthPrompt: z.string().trim().min(1).max(1000),
  expectedText: z.string().trim().max(200),
  timeoutMs: z.number().int().min(1000).max(120000),
  maxOutputTokens: z.number().int().min(16).max(8000),
  retentionDays: z.number().int().min(7).max(3650)
});
