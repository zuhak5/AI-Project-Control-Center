import { randomUUID } from "node:crypto";
import { AppError, ProviderError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { assertSafeOutboundUrl, readProviderSecret } from "@/lib/security";
import type {
  HealthCheckResult,
  ProjectConfig,
  ProviderExecutionInput,
  ProviderExecutionResult,
  UsageEvent
} from "@/lib/types";

function endpoint(baseUrl: string, suffix: string): URL {
  const base = assertSafeOutboundUrl(baseUrl);
  const normalized = base.toString().replace(/\/$/, "");
  return assertSafeOutboundUrl(`${normalized}${suffix}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value;
  return null;
}

function extractOpenAIText(payload: unknown): string {
  const root = asRecord(payload);
  const direct = firstString(root.output_text, root.text);
  if (direct) return direct;

  const output = Array.isArray(root.output) ? root.output : [];
  const fragments: string[] = [];
  for (const item of output) {
    const content = Array.isArray(asRecord(item).content) ? asRecord(item).content as unknown[] : [];
    for (const part of content) {
      const text = firstString(asRecord(part).text, asRecord(part).output_text);
      if (text) fragments.push(text);
    }
  }

  const choices = Array.isArray(root.choices) ? root.choices : [];
  const choice = asRecord(choices[0]);
  const message = asRecord(choice.message);
  const legacy = firstString(message.content, choice.text);
  if (legacy) fragments.push(legacy);
  return fragments.join("\n").trim();
}

async function executeOpenAI(input: ProviderExecutionInput): Promise<ProviderExecutionResult> {
  const secret = readProviderSecret(input.project.apiKeyEnv);
  const url = endpoint(input.project.baseUrl, "/responses");
  const started = Date.now();
  const { response, json } = await fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      model: input.model ?? input.project.defaultModel,
      input: input.prompt,
      ...(input.system ? { instructions: input.system } : {}),
      max_output_tokens: input.maxOutputTokens ?? 800,
      ...(typeof input.temperature === "number" ? { temperature: input.temperature } : {})
    })
  }, input.project.healthCheck.timeoutMs);

  const root = asRecord(json);
  const usage = asRecord(root.usage);
  const text = extractOpenAIText(json);
  if (!text) throw new ProviderError("Provider response did not contain assistant text.", 502, "provider_empty_output", response.status);

  return {
    text,
    model: firstString(root.model, input.model, input.project.defaultModel) ?? input.project.defaultModel,
    latencyMs: Date.now() - started,
    inputTokens: numberValue(usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: numberValue(usage.output_tokens ?? usage.completion_tokens),
    requestId: firstString(root.id, response.headers.get("x-request-id")),
    statusCode: response.status,
    raw: json
  };
}

async function executeAnthropic(input: ProviderExecutionInput): Promise<ProviderExecutionResult> {
  const secret = readProviderSecret(input.project.apiKeyEnv);
  const url = endpoint(input.project.baseUrl, "/messages");
  const started = Date.now();
  const { response, json } = await fetchJson(url, {
    method: "POST",
    headers: {
      "x-api-key": secret,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      model: input.model ?? input.project.defaultModel,
      max_tokens: input.maxOutputTokens ?? 800,
      ...(input.system ? { system: input.system } : {}),
      messages: [{ role: "user", content: input.prompt }],
      ...(typeof input.temperature === "number" ? { temperature: input.temperature } : {})
    })
  }, input.project.healthCheck.timeoutMs);

  const root = asRecord(json);
  const content = Array.isArray(root.content) ? root.content : [];
  const text = content
    .map((part) => firstString(asRecord(part).text))
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .trim();
  const usage = asRecord(root.usage);
  if (!text) throw new ProviderError("Provider response did not contain assistant text.", 502, "provider_empty_output", response.status);

  return {
    text,
    model: firstString(root.model, input.model, input.project.defaultModel) ?? input.project.defaultModel,
    latencyMs: Date.now() - started,
    inputTokens: numberValue(usage.input_tokens),
    outputTokens: numberValue(usage.output_tokens),
    requestId: firstString(root.id, response.headers.get("request-id")),
    statusCode: response.status,
    raw: json
  };
}

async function executeGemini(input: ProviderExecutionInput): Promise<ProviderExecutionResult> {
  const secret = readProviderSecret(input.project.apiKeyEnv);
  const model = input.model ?? input.project.defaultModel;
  const url = endpoint(input.project.baseUrl, `/models/${encodeURIComponent(model)}:generateContent`);
  const started = Date.now();
  const { response, json } = await fetchJson(url, {
    method: "POST",
    headers: { "x-goog-api-key": secret, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: {
        maxOutputTokens: input.maxOutputTokens ?? 800,
        ...(typeof input.temperature === "number" ? { temperature: input.temperature } : {})
      }
    })
  }, input.project.healthCheck.timeoutMs);

  const root = asRecord(json);
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  const parts = Array.isArray(asRecord(asRecord(candidates[0]).content).parts)
    ? asRecord(asRecord(candidates[0]).content).parts as unknown[]
    : [];
  const text = parts.map((part) => firstString(asRecord(part).text)).filter(Boolean).join("\n").trim();
  const usage = asRecord(root.usageMetadata);
  if (!text) throw new ProviderError("Provider response did not contain assistant text.", 502, "provider_empty_output", response.status);

  return {
    text,
    model,
    latencyMs: Date.now() - started,
    inputTokens: numberValue(usage.promptTokenCount),
    outputTokens: numberValue(usage.candidatesTokenCount),
    requestId: response.headers.get("x-request-id"),
    statusCode: response.status,
    raw: json
  };
}

async function executeCustom(input: ProviderExecutionInput): Promise<ProviderExecutionResult> {
  const secret = readProviderSecret(input.project.apiKeyEnv);
  const url = assertSafeOutboundUrl(input.project.baseUrl);
  const started = Date.now();
  const { response, json } = await fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      model: input.model ?? input.project.defaultModel,
      prompt: input.prompt,
      system: input.system ?? "",
      max_output_tokens: input.maxOutputTokens ?? 800,
      temperature: input.temperature
    })
  }, input.project.healthCheck.timeoutMs);

  const root = asRecord(json);
  const data = asRecord(root.data);
  const text = firstString(root.output_text, root.output, root.text, root.message, data.text, extractOpenAIText(json));
  const usage = asRecord(root.usage);
  if (!text) throw new ProviderError("Custom provider response did not expose a recognized text field.", 502, "provider_empty_output", response.status);

  return {
    text,
    model: firstString(root.model, input.model, input.project.defaultModel) ?? input.project.defaultModel,
    latencyMs: Date.now() - started,
    inputTokens: numberValue(usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: numberValue(usage.output_tokens ?? usage.completion_tokens),
    requestId: firstString(root.id, response.headers.get("x-request-id")),
    statusCode: response.status,
    raw: json
  };
}

export async function executeProvider(input: ProviderExecutionInput): Promise<ProviderExecutionResult> {
  if (!input.project.enabled) throw new AppError("Project is disabled.", 409, "project_disabled");
  const model = input.model ?? input.project.defaultModel;
  if (!input.project.allowedModels.includes(model)) {
    throw new AppError("Selected model is not in the project allowlist.", 400, "model_not_allowed");
  }

  switch (input.project.provider) {
    case "openai-responses": return executeOpenAI(input);
    case "anthropic-messages": return executeAnthropic(input);
    case "gemini-generate": return executeGemini(input);
    case "custom-json": return executeCustom(input);
  }
}

export function successEvent(project: ProjectConfig, result: ProviderExecutionResult, source: UsageEvent["source"]): UsageEvent {
  return {
    id: randomUUID(),
    projectId: project.id,
    source,
    timestamp: new Date().toISOString(),
    status: "success",
    statusCode: result.statusCode,
    model: result.model,
    latencyMs: result.latencyMs,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCostUsd: 0,
    requestId: result.requestId,
    errorCategory: null,
    note: null
  };
}

export function errorEvent(project: ProjectConfig, error: unknown, source: UsageEvent["source"], started: number): UsageEvent {
  const providerError = error instanceof AppError ? error : null;
  return {
    id: randomUUID(),
    projectId: project.id,
    source,
    timestamp: new Date().toISOString(),
    status: "error",
    statusCode: providerError instanceof ProviderError ? providerError.upstreamStatus : providerError?.statusCode ?? null,
    model: project.defaultModel,
    latencyMs: Date.now() - started,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    requestId: null,
    errorCategory: providerError?.code ?? "unexpected_error",
    note: providerError?.message.slice(0, 300) ?? "Unexpected provider failure"
  };
}

export async function performHealthCheck(project: ProjectConfig): Promise<{ check: HealthCheckResult; event: UsageEvent }> {
  const started = Date.now();
  try {
    const result = await executeProvider({
      project,
      prompt: project.healthCheck.prompt,
      model: project.defaultModel,
      maxOutputTokens: 80,
      temperature: 0
    });
    const expected = project.healthCheck.expectedText.trim();
    const matches = !expected || result.text.toLowerCase().includes(expected.toLowerCase());
    const status = matches ? "healthy" : "degraded";
    return {
      check: {
        id: randomUUID(),
        projectId: project.id,
        timestamp: new Date().toISOString(),
        status,
        latencyMs: result.latencyMs,
        model: result.model,
        message: matches ? "Provider response matched the health expectation." : "Provider responded, but the expected text was not present."
      },
      event: successEvent(project, result, "health-check")
    };
  } catch (error) {
    return {
      check: {
        id: randomUUID(),
        projectId: project.id,
        timestamp: new Date().toISOString(),
        status: "down",
        latencyMs: Date.now() - started,
        model: project.defaultModel,
        message: error instanceof Error ? error.message.slice(0, 300) : "Health check failed."
      },
      event: errorEvent(project, error, "health-check", started)
    };
  }
}
