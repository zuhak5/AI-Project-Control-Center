import { ProviderError } from "@/lib/errors";

const MAX_PROVIDER_RESPONSE_BYTES = 1_500_000;

export async function fetchJson(
  url: URL,
  init: RequestInit,
  timeoutMs: number
): Promise<{ response: Response; json: unknown; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      redirect: "error",
      cache: "no-store",
      signal: controller.signal
    });

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new ProviderError("Provider response exceeded the size limit.", 502, "provider_response_too_large", response.status);
    }

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > MAX_PROVIDER_RESPONSE_BYTES) {
            await reader.cancel();
            throw new ProviderError("Provider response exceeded the size limit.", 502, "provider_response_too_large", response.status);
          }
          chunks.push(value);
        }
      }
    }

    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(merged);

    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new ProviderError("Provider returned invalid JSON.", 502, "provider_invalid_json", response.status);
      }
    }

    if (!response.ok) {
      const message = extractProviderMessage(json) ?? `Provider returned HTTP ${response.status}.`;
      throw new ProviderError(message, 502, "provider_http_error", response.status);
    }

    return { response, json, text };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ProviderError("Provider request timed out.", 504, "provider_timeout");
    }
    throw new ProviderError("Provider request failed.", 502, "provider_network_error");
  } finally {
    clearTimeout(timer);
  }
}

function extractProviderMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const error = record.error;
  if (typeof error === "string") return error.slice(0, 300);
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message.slice(0, 300);
  }
  const message = record.message;
  return typeof message === "string" ? message.slice(0, 300) : null;
}
