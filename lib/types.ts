export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";
export type GatewayEventSource = "playground" | "health-check";

export interface GatewayEvent {
  id: string;
  source: GatewayEventSource;
  timestamp: string;
  status: "success" | "error";
  statusCode: number | null;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
  errorCategory: string | null;
  note: string | null;
}

export interface HealthCheckResult {
  id: string;
  timestamp: string;
  status: Exclude<HealthStatus, "unknown">;
  latencyMs: number;
  model: string;
  message: string;
  statusCode: number | null;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  summary: string;
}

export interface GatewaySettings {
  healthPrompt: string;
  expectedText: string;
  timeoutMs: number;
  maxOutputTokens: number;
  retentionDays: number;
}

export interface GatewayState {
  version: 2;
  events: GatewayEvent[];
  healthChecks: HealthCheckResult[];
  auditLog: AuditEvent[];
  settings: GatewaySettings;
  updatedAt: string;
}

export interface GatewayExecutionInput {
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GatewayExecutionResult {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
  responseId: string | null;
  responseStatus: string | null;
  statusCode: number;
}

export interface SessionUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  githubId: number;
}

export interface SessionPayload {
  user: SessionUser;
  issuedAt: number;
  expiresAt: number;
}
