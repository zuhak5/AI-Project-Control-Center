import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { AppError } from "@/lib/errors";
import { emptyState, normalizeState, pruneState } from "@/lib/state-model";
import type { GatewayState } from "@/lib/types";

const STATE_PATH = "homepilot-ai-gateway-console/state.json";
const LOCAL_PATH = join(process.cwd(), ".data", "homepilot-gateway-state.json");
const MAX_STATE_BYTES = 5_000_000;

export type StorageMode = "blob-token" | "blob-oidc" | "local" | "unavailable";
export interface StateRead { state: GatewayState; etag?: string }

function configured(value: string | undefined): boolean { return Boolean(value?.trim()); }
export function getStorageMode(): StorageMode {
  if (configured(process.env.BLOB_READ_WRITE_TOKEN)) return "blob-token";
  if (configured(process.env.VERCEL) && configured(process.env.BLOB_STORE_ID)) return "blob-oidc";
  return configured(process.env.VERCEL) ? "unavailable" : "local";
}
export function isPersistentStorageConfigured(): boolean { return getStorageMode().startsWith("blob-"); }
function storageError(action: "read" | "write", error: unknown): AppError {
  console.error(`Vercel Blob ${action} failed.`, error);
  return new AppError(`Persistent storage ${action} failed. Verify the private Blob connection and redeploy.`, 503, `storage_${action}_failed`);
}
async function readBoundedStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_STATE_BYTES) {
      await reader.cancel();
      throw new AppError("Stored gateway state exceeds the supported size.", 503, "storage_state_too_large");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}
function parseState(text: string): GatewayState {
  try { return normalizeState(JSON.parse(text)); }
  catch (error) {
    if (error instanceof SyntaxError) throw new AppError("Stored gateway state is invalid JSON.", 503, "storage_state_invalid");
    throw error;
  }
}
export async function readState(): Promise<StateRead> {
  const mode = getStorageMode();
  if (mode === "blob-token" || mode === "blob-oidc") {
    try {
      const result = await get(STATE_PATH, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) return { state: emptyState() };
      return { state: parseState(await readBoundedStream(result.stream)), etag: result.blob.etag };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw storageError("read", error);
    }
  }
  if (mode === "unavailable") return { state: emptyState() };
  try {
    const text = await readFile(LOCAL_PATH, "utf8");
    if (Buffer.byteLength(text, "utf8") > MAX_STATE_BYTES) throw new AppError("Stored gateway state exceeds the supported size.", 503, "storage_state_too_large");
    return { state: parseState(text) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: emptyState() };
    if (error instanceof AppError) throw error;
    throw new AppError("Local gateway state could not be read.", 503, "storage_read_failed");
  }
}
export async function writeState(state: GatewayState, etag?: string): Promise<void> {
  const normalized = normalizeState(structuredClone(state));
  normalized.updatedAt = new Date().toISOString();
  pruneState(normalized);
  const body = JSON.stringify(normalized, null, 2);
  if (Buffer.byteLength(body, "utf8") > MAX_STATE_BYTES) throw new AppError("Gateway state exceeds the supported storage size.", 507, "storage_state_too_large");
  const mode = getStorageMode();
  if (mode === "blob-token" || mode === "blob-oidc") {
    try {
      await put(STATE_PATH, body, {
        access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true,
        ...(etag ? { ifMatch: etag } : {})
      });
      return;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) throw error;
      throw storageError("write", error);
    }
  }
  if (mode === "unavailable") throw new AppError("Connect a private Blob store to this Vercel deployment and redeploy Production.", 503, "storage_not_configured");
  await mkdir(dirname(LOCAL_PATH), { recursive: true });
  const temporaryPath = `${LOCAL_PATH}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, body, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, LOCAL_PATH);
  } catch {
    throw new AppError("Local gateway state could not be written.", 503, "storage_write_failed");
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export { BlobPreconditionFailedError };
