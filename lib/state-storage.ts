import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { AppError } from "@/lib/errors";
import { emptyState, normalizeState, pruneState } from "@/lib/state-model";
import type { GatewayState } from "@/lib/types";

const STATE_PATH = "homepilot-ai-gateway-console/state.json";
const LOCAL_PATH = join(process.cwd(), ".data", "homepilot-gateway-state.json");

export type StorageMode = "blob-token" | "blob-oidc" | "local" | "unavailable";
export interface StateRead { state: GatewayState; etag?: string }

export function getStorageMode(): StorageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob-token";
  if (process.env.VERCEL && process.env.BLOB_STORE_ID) return "blob-oidc";
  return process.env.VERCEL ? "unavailable" : "local";
}

export function isPersistentStorageConfigured(): boolean {
  return getStorageMode().startsWith("blob-");
}

function storageError(action: "read" | "write", error: unknown): AppError {
  console.error(`Vercel Blob ${action} failed.`, error);
  return new AppError(`Persistent storage ${action} failed. Verify the private Blob connection and redeploy.`, 503, `storage_${action}_failed`);
}

export async function readState(): Promise<StateRead> {
  const mode = getStorageMode();
  if (mode === "blob-token" || mode === "blob-oidc") {
    try {
      const result = await get(STATE_PATH, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) return { state: emptyState() };
      const text = await new Response(result.stream).text();
      return { state: normalizeState(JSON.parse(text)), etag: result.blob.etag };
    } catch (error) {
      if (error instanceof SyntaxError) throw new AppError("Stored gateway state is invalid.", 503, "storage_state_invalid");
      throw storageError("read", error);
    }
  }
  if (mode === "unavailable") return { state: emptyState() };
  try { return { state: normalizeState(JSON.parse(await readFile(LOCAL_PATH, "utf8"))) }; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: emptyState() };
    throw error;
  }
}

export async function writeState(state: GatewayState, etag?: string): Promise<void> {
  state.updatedAt = new Date().toISOString();
  pruneState(state);
  const body = JSON.stringify(state, null, 2);
  const mode = getStorageMode();
  if (mode === "blob-token" || mode === "blob-oidc") {
    try {
      await put(STATE_PATH, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, ...(etag ? { ifMatch: etag } : {}) });
      return;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) throw error;
      throw storageError("write", error);
    }
  }
  if (mode === "unavailable") throw new AppError("Connect a private Blob store to this Vercel deployment and redeploy Production.", 503, "storage_not_configured");
  await mkdir(dirname(LOCAL_PATH), { recursive: true });
  await writeFile(LOCAL_PATH, body, "utf8");
}

export { BlobPreconditionFailedError };
