import "server-only";
import { AppError } from "@/lib/errors";
import { defaultGatewaySettings, emptyState } from "@/lib/state-model";
import { BlobPreconditionFailedError, getStorageMode, isPersistentStorageConfigured, readState, writeState } from "@/lib/state-storage";
import type { AuditEvent, GatewayEvent, GatewaySettings, GatewayState, HealthCheckResult } from "@/lib/types";

let queue: Promise<void> = Promise.resolve();
const MAX_CONDITIONAL_ATTEMPTS = 7;

type ConflictPolicy = "strict" | "telemetry-fallback";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function conflictDelayMs(attempt: number): number {
  const ceiling = Math.min(1_000, 40 * (2 ** attempt));
  return ceiling + Math.floor(Math.random() * ceiling);
}

async function mutate<T>(
  mutator: (state: GatewayState) => T | Promise<T>,
  conflictPolicy: ConflictPolicy = "strict"
): Promise<T> {
  let release: () => void = () => undefined;
  const previous = queue;
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;

  try {
    for (let attempt = 0; attempt < MAX_CONDITIONAL_ATTEMPTS; attempt += 1) {
      const { state, etag } = await readState();
      const result = await mutator(state);

      try {
        await writeState(state, etag);
        return result;
      } catch (error) {
        if (!(error instanceof BlobPreconditionFailedError)) throw error;
        if (attempt < MAX_CONDITIONAL_ATTEMPTS - 1) {
          await wait(conflictDelayMs(attempt));
          continue;
        }
      }
    }

    if (conflictPolicy === "telemetry-fallback") {
      // Telemetry is append-only and best effort. After repeated distributed CAS
      // collisions, merge once more against a consistent read and persist with
      // last-writer-wins semantics so a healthy gateway result is not discarded.
      const { state } = await readState();
      const result = await mutator(state);
      await writeState(state);
      console.warn("Telemetry persisted after repeated Blob ETag conflicts using last-writer-wins fallback.");
      return result;
    }

    throw new AppError("Concurrent storage update could not be completed. Retry the settings change.", 409, "storage_conflict");
  } finally {
    release();
  }
}

async function bestEffort(action: string, operation: () => Promise<void>): Promise<boolean> {
  try { await operation(); return true; }
  catch (error) { console.error(`Best-effort ${action} persistence failed.`, error); return false; }
}

export interface StateSnapshot {
  state: GatewayState;
  storageReadable: boolean;
  storageErrorCode: string | null;
}

export { getStorageMode, isPersistentStorageConfigured };
export async function getState(): Promise<GatewayState> { return (await readState()).state; }
export async function getStateSnapshot(): Promise<StateSnapshot> {
  if (getStorageMode() === "unavailable") {
    return { state: emptyState(), storageReadable: false, storageErrorCode: "storage_not_configured" };
  }
  try { return { state: (await readState()).state, storageReadable: true, storageErrorCode: null }; }
  catch (error) {
    console.error("Could not read gateway state; rendering a degraded read-only snapshot.", error);
    return {
      state: emptyState(),
      storageReadable: false,
      storageErrorCode: error instanceof AppError ? error.code : "storage_read_failed"
    };
  }
}
export async function getOperationalSettings(): Promise<GatewaySettings> {
  try { return (await readState()).state.settings; }
  catch (error) { console.error("Could not read operational settings; using safe defaults.", error); return defaultGatewaySettings(); }
}
export async function appendGatewayEvent(event: GatewayEvent): Promise<void> {
  await mutate((state) => { state.events.unshift(event); }, "telemetry-fallback");
}
export async function tryAppendGatewayEvent(event: GatewayEvent): Promise<boolean> {
  return bestEffort("gateway event", () => appendGatewayEvent(event));
}
export async function appendHealthCheck(check: HealthCheckResult, event: GatewayEvent): Promise<void> {
  await mutate((state) => { state.healthChecks.unshift(check); state.events.unshift(event); }, "telemetry-fallback");
}
export async function tryAppendHealthCheck(check: HealthCheckResult, event: GatewayEvent): Promise<boolean> {
  return bestEffort("health check", () => appendHealthCheck(check, event));
}
export async function updateSettings(settings: GatewaySettings, audit: AuditEvent): Promise<GatewaySettings> {
  return mutate((state) => { state.settings = settings; state.auditLog.unshift(audit); return state.settings; });
}
