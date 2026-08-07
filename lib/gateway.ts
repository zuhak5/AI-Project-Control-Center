import "server-only";
import { randomUUID } from "node:crypto";
import { AppError, ProviderError } from "@/lib/errors";
import { DEFAULT_GATEWAY_MODEL, getGatewayEndpoint, getGatewayModel } from "@/lib/gateway-config";
import type { GatewayEvent, GatewayExecutionInput, GatewayExecutionResult, GatewaySettings, HealthCheckResult } from "@/lib/types";

const MAX_RESPONSE_BYTES = 1_500_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;

function requiredSecret(name: "CLIPROXY_API_KEY" | "HOME_GATEWAY_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new AppError(`Vercel environment variable ${name} is not configured.`, 409, "gateway_secret_missing");
  if (/[\r\n]/.test(value)) throw new AppError(`Vercel environment variable ${name} contains invalid whitespace.`, 500, "gateway_secret_invalid");
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function nonnegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function boundedTimeout(timeoutMs: number): number {
  if (!Number.isFinite(timeoutMs)) return 30_000;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(timeoutMs)));
}

function safeGatewayModel(): string {
  try { return getGatewayModel(); } catch { return DEFAULT_GATEWAY_MODEL; }
}

export function extractGatewayText(payload: unknown): string {
  const root = asRecord(payload);
  const direct = firstString(root.output_text, root.text);
  if (direct) return direct;
  const fragments: string[] = [];
  const output = Array.isArray(root.output) ? root.output : [];
  for (const item of output) {
    const itemRecord = asRecord(item);
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const part of content) {
      const partRecord = asRecord(part);
      const text = firstString(partRecord.text, partRecord.output_text, partRecord.refusal);
      if (text) fragments.push(text);
    }
  }
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const choice = asRecord(choices[0]);
  const message = asRecord(choice.message);
  const legacy = firstString(message.content, message.refusal, choice.text);
  if (legacy) fragments.push(legacy);
  return fragments.join("\n").trim();
}

async function readBoundedResponse(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new ProviderError("Gateway response exceeded the size limit.", 502, "gateway_response_too_large", response.status);
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

function upstreamError(status: number): ProviderError {
  const category = status === 401 || status === 403 ? "gateway_authentication_failed"
    : status === 404 ? "gateway_route_not_found"
    : status === 429 ? "upstream_rate_limited"
    : status >= 500 ? "gateway_or_upstream_unavailable"
    : "gateway_request_rejected";
  const message = category === "gateway_authentication_failed" ? "The gateway rejected one of the configured credentials."
    : category === "gateway_route_not_found" ? "The fixed gateway route was not found."
    : category === "upstream_rate_limited" ? "The upstream AI account rate-limited the request."
    : category === "gateway_or_upstream_unavailable" ? "The gateway or upstream AI service is unavailable."
    : `The gateway rejected the request with HTTP ${status}.`;
  const publicStatus = status === 429 ? 429 : status === 408 || status === 504 ? 504 : 502;
  return new ProviderError(message, publicStatus, category, status);
}

function persistedErrorNote(code: string): string {
  const notes: Record<string, string> = {
    gateway_timeout: "The end-to-end gateway request timed out.",
    gateway_network_error: "The gateway could not be reached from Vercel.",
    gateway_authentication_failed: "The gateway rejected one of the configured credentials.",
    gateway_route_not_found: "The configured gateway route was not found.",
    upstream_rate_limited: "The upstream AI account rate-limited the request.",
    gateway_or_upstream_unavailable: "The gateway or upstream AI service was unavailable.",
    gateway_response_too_large: "The gateway returned a response larger than the console limit.",
    gateway_invalid_json: "The gateway returned an invalid success payload.",
    gateway_empty_output: "The gateway response did not contain assistant text.",
    gateway_response_failed: "The Responses API reported a failed response.",
    gateway_secret_missing: "A required Vercel gateway credential is missing.",
    gateway_secret_invalid: "A required Vercel gateway credential is invalid.",
    gateway_url_invalid: "The fixed gateway URL configuration is invalid.",
    gateway_model_invalid: "The configured gateway model identifier is invalid."
  };
  return notes[code] ?? "The gateway request failed before completion.";
}

export async function executeGateway(input: GatewayExecutionInput, timeoutMs: number): Promise<GatewayExecutionResult> {
  const endpoint = getGatewayEndpoint();
  const model = getGatewayModel();
  const clientRequestId = randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), boundedTimeout(timeoutMs));
  const started = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredSecret("CLIPROXY_API_KEY")}`,
        "X-HomePilot-Gateway-Secret": requiredSecret("HOME_GATEWAY_SECRET"),
        "X-Client-Request-Id": clientRequestId,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        model,
        input: input.prompt,
        ...(input.system ? { instructions: input.system } : {}),
        max_output_tokens: input.maxOutputTokens ?? 800,
        store: false,
        ...(typeof input.temperature === "number" ? { temperature: input.temperature } : {})
      }),
      redirect: "error",
      cache: "no-store",
      signal: controller.signal
    });
    const text = await readBoundedResponse(response);
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; }
    catch {
      if (response.ok) throw new ProviderError("Gateway returned a non-JSON success response.", 502, "gateway_invalid_json", response.status);
    }
    if (!response.ok) throw upstreamError(response.status);
    const root = asRecord(json);
    const responseStatus = firstString(root.status);
    if (responseStatus === "failed" || responseStatus === "cancelled") throw new ProviderError("The Responses API reported a failed or cancelled response.", 502, "gateway_response_failed", response.status);
    const output = extractGatewayText(json);
    if (!output) throw new ProviderError("Gateway response did not contain assistant text.", 502, "gateway_empty_output", response.status);
    const usage = asRecord(root.usage);
    return {
      text: output,
      model: firstString(root.model, model) || model,
      latencyMs: Date.now() - started,
      inputTokens: nonnegativeInteger(usage.input_tokens ?? usage.prompt_tokens),
      outputTokens: nonnegativeInteger(usage.output_tokens ?? usage.completion_tokens),
      requestId: firstString(response.headers.get("x-request-id"), clientRequestId),
      responseId: firstString(root.id),
      responseStatus,
      statusCode: response.status
    };
  } catch (error) {
    if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) throw new ProviderError("Gateway request timed out.", 504, "gateway_timeout");
    if (error instanceof AppError) throw error;
    throw new ProviderError("The gateway could not be reached from Vercel.", 502, "gateway_network_error");
  } finally { clearTimeout(timer); }
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
  const code = appError?.code ?? "unexpected_error";
  return {
    id: randomUUID(), source, timestamp: new Date().toISOString(), status: "error",
    statusCode: appError instanceof ProviderError ? appError.upstreamStatus : null,
    model: safeGatewayModel(), latencyMs: Math.max(0, Date.now() - started), inputTokens: 0, outputTokens: 0,
    requestId: null, errorCategory: code, note: persistedErrorNote(code)
  };
}

function normalizedHealthText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export async function performHealthCheck(settings: GatewaySettings): Promise<{ check: HealthCheckResult; event: GatewayEvent }> {
  const started = Date.now();
  try {
    const result = await executeGateway({ prompt: settings.healthPrompt, maxOutputTokens: Math.min(settings.maxOutputTokens, 120) }, settings.timeoutMs);
    const expected = normalizedHealthText(settings.expectedText);
    const completed = !result.responseStatus || result.responseStatus === "completed";
    const matches = !expected || normalizedHealthText(result.text) === expected;
    const healthy = completed && matches;
    const message = healthy
      ? "The complete Vercel → Caddy → Nginx → CLIProxyAPI → upstream path responded exactly as expected."
      : !completed ? `The gateway returned Responses API status ${result.responseStatus}.`
        : "The gateway responded, but its normalized text did not exactly match the expected health text.";
    return {
      check: {
        id: randomUUID(), timestamp: new Date().toISOString(), status: healthy ? "healthy" : "degraded",
        latencyMs: result.latencyMs, model: result.model, statusCode: result.statusCode, message
      },
      event: successEvent(result, "health-check")
    };
  } catch (error) {
    const event = errorEvent(error, "health-check", started);
    return {
      check: {
        id: randomUUID(), timestamp: new Date().toISOString(), status: "down",
        latencyMs: event.latencyMs, model: safeGatewayModel(), statusCode: event.statusCode,
        message: event.note || "End-to-end gateway health check failed."
      },
      event
    };
  }
}
