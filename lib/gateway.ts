import "server-only";
import { randomUUID } from "node:crypto";
import { AppError, ProviderError } from "@/lib/errors";
import { getGatewayEndpoint, getGatewayModel } from "@/lib/gateway-config";
import type { GatewayEvent, GatewayExecutionInput, GatewayExecutionResult, GatewaySettings, HealthCheckResult } from "@/lib/types";

const MAX_RESPONSE_BYTES = 1_500_000;

function requiredSecret(name: "CLIPROXY_API_KEY" | "HOME_GATEWAY_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new AppError(`Vercel environment variable ${name} is not configured.`, 409, "gateway_secret_missing");
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value;
  return null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function extractGatewayText(payload: unknown): string {
  const root = asRecord(payload);
  const direct = firstString(root.output_text, root.text);
  if (direct) return direct;
  const fragments: string[] = [];
  const output = Array.isArray(root.output) ? root.output : [];
  for (const item of output) {
    const content = Array.isArray(asRecord(item).content) ? asRecord(item).content as unknown[] : [];
    for (const part of content) {
      const text = firstString(asRecord(part).text, asRecord(part).output_text);
      if (text) fragments.push(text);
    }
  }
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const choice = asRecord(choices[0]);
  const legacy = firstString(asRecord(choice.message).content, choice.text);
  if (legacy) fragments.push(legacy);
  return fragments.join("\n").trim();
}

async function readBoundedResponse(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_RESPONSE_BYTES) throw new ProviderError("Gateway response exceeded the size limit.", 502, "gateway_response_too_large", response.status);
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ProviderError("Gateway response exceeded the size limit.", 502, "gateway_response_too_large", response.status);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}

function upstreamError(status: number, payload: unknown, text: string): ProviderError {
  const root = asRecord(payload);
  const detail = firstString(asRecord(root.error).message, root.message, text)?.slice(0, 240);
  const category = status === 401 || status === 403 ? "gateway_authentication_failed"
    : status === 404 ? "gateway_route_not_found"
    : status === 429 ? "upstream_rate_limited"
    : status >= 500 ? "gateway_or_upstream_unavailable"
    : "gateway_request_rejected";
  return new ProviderError(detail || `Gateway returned HTTP ${status}.`, 502, category, status);
}

export async function executeGateway(input: GatewayExecutionInput, timeoutMs: number): Promise<GatewayExecutionResult> {
  const endpoint = getGatewayEndpoint();
  const model = getGatewayModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredSecret("CLIPROXY_API_KEY")}`,
        "X-HomePilot-Gateway-Secret": requiredSecret("HOME_GATEWAY_SECRET"),
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        model,
        input: input.prompt,
        ...(input.system ? { instructions: input.system } : {}),
        max_output_tokens: input.maxOutputTokens ?? 800,
        ...(typeof input.temperature === "number" ? { temperature: input.temperature } : {})
      }),
      redirect: "error",
      cache: "no-store",
      signal: controller.signal
    });
    const text = await readBoundedResponse(response);
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { text }; }
    if (!response.ok) throw upstreamError(response.status, json, text);
    const output = extractGatewayText(json);
    if (!output) throw new ProviderError("Gateway response did not contain assistant text.", 502, "gateway_empty_output", response.status);
    const root = asRecord(json);
    const usage = asRecord(root.usage);
    return {
      text: output,
      model: firstString(root.model, model) || model,
      latencyMs: Date.now() - started,
      inputTokens: numberValue(usage.input_tokens ?? usage.prompt_tokens),
      outputTokens: numberValue(usage.output_tokens ?? usage.completion_tokens),
      requestId: firstString(root.id, response.headers.get("x-request-id")),
      statusCode: response.status,
      raw: json
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ProviderError("Gateway request timed out.", 504, "gateway_timeout");
    }
    if (error instanceof AppError) throw error;
    throw new ProviderError(error instanceof Error ? error.message : "Gateway request failed.", 502, "gateway_network_error");
  } finally {
    clearTimeout(timer);
  }
}

export function successEvent(result: GatewayExecutionResult, source: GatewayEvent["source"]): GatewayEvent {
  return {
    id: randomUUID(), source, timestamp: new Date().toISOString(), status: "success",
    statusCode: result.statusCode, model: result.model, latencyMs: result.latencyMs,
    inputTokens: result.inputTokens, outputTokens: result.outputTokens,
    requestId: result.requestId, errorCategory: null, note: null
  };
}

export function errorEvent(error: unknown, source: GatewayEvent["source"], started: number): GatewayEvent {
  const appError = error instanceof AppError ? error : null;
  return {
    id: randomUUID(), source, timestamp: new Date().toISOString(), status: "error",
    statusCode: appError instanceof ProviderError ? appError.upstreamStatus : appError?.statusCode ?? null,
    model: getGatewayModel(), latencyMs: Date.now() - started, inputTokens: 0, outputTokens: 0,
    requestId: null, errorCategory: appError?.code ?? "unexpected_error",
    note: error instanceof Error ? error.message.slice(0, 300) : "Unexpected gateway failure"
  };
}

export async function performHealthCheck(settings: GatewaySettings): Promise<{ check: HealthCheckResult; event: GatewayEvent }> {
  const started = Date.now();
  try {
    const result = await executeGateway({ prompt: settings.healthPrompt, maxOutputTokens: Math.min(settings.maxOutputTokens, 120), temperature: 0 }, settings.timeoutMs);
    const expected = settings.expectedText.trim();
    const matches = !expected || result.text.toLowerCase().includes(expected.toLowerCase());
    return {
      check: {
        id: randomUUID(), timestamp: new Date().toISOString(), status: matches ? "healthy" : "degraded",
        latencyMs: result.latencyMs, model: result.model, statusCode: result.statusCode,
        message: matches ? "The complete Vercel → zrok → Nginx → CLIProxyAPI → upstream path responded as expected." : "The gateway responded, but the expected health text was not present."
      },
      event: successEvent(result, "health-check")
    };
  } catch (error) {
    const event = errorEvent(error, "health-check", started);
    return {
      check: {
        id: randomUUID(), timestamp: new Date().toISOString(), status: "down",
        latencyMs: event.latencyMs, model: getGatewayModel(), statusCode: event.statusCode,
        message: event.note || "End-to-end gateway health check failed."
      },
      event
    };
  }
}
