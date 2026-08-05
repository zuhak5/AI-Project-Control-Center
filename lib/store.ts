import "server-only";
import { AppError } from "@/lib/errors";
import { BlobPreconditionFailedError, getStorageMode, isPersistentStorageConfigured, readState, writeState } from "@/lib/state-storage";
import type { AuditEvent, GatewayEvent, GatewaySettings, GatewayState, HealthCheckResult } from "@/lib/types";

let queue: Promise<void> = Promise.resolve();

async function mutate<T>(mutator: (state: GatewayState) => T | Promise<T>): Promise<T> {
  let release: () => void = () => undefined;
  const previous = queue;
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { state, etag } = await readState();
      const result = await mutator(state);
      try { await writeState(state, etag); return result; }
      catch (error) {
        if (error instanceof BlobPreconditionFailedError && attempt < 3) continue;
        throw error;
      }
    }
    throw new AppError("Concurrent storage update could not be completed.", 409, "storage_conflict");
  } finally { release(); }
}

export { getStorageMode, isPersistentStorageConfigured };
export async function getState(): Promise<GatewayState> { return (await readState()).state; }
export async function appendGatewayEvent(event: GatewayEvent): Promise<void> { await mutate((state) => { state.events.unshift(event); }); }
export async function appendHealthCheck(check: HealthCheckResult, event: GatewayEvent): Promise<void> { await mutate((state) => { state.healthChecks.unshift(check); state.events.unshift(event); }); }
export async function updateSettings(settings: GatewaySettings, audit: AuditEvent): Promise<GatewaySettings> {
  return mutate((state) => { state.settings = settings; state.auditLog.unshift(audit); return state.settings; });
}
