export type ProviderKind =
  | "openai-responses"
  | "anthropic-messages"
  | "gemini-generate"
  | "custom-json";

export type EnvironmentKind = "development" | "staging" | "production" | "other";
export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";
export type EventSource = "playground" | "health-check" | "telemetry";

export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  environment: EnvironmentKind;
  provider: ProviderKind;
  enabled: boolean;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModel: string;
  allowedModels: string[];
  tags: string[];
  monthlyBudgetUsd: number | null;
  healthCheck: {
    enabled: boolean;
    prompt: string;
    expectedText: string;
    timeoutMs: number;
  };
  telemetry: {
    enabled: boolean;
    ingestTokenHash: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  projectId: string;
  source: EventSource;
  timestamp: string;
  status: "success" | "error";
  statusCode: number | null;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  requestId: string | null;
  errorCategory: string | null;
  note: string | null;
}

export interface HealthCheckResult {
  id: string;
  projectId: string;
  timestamp: string;
  status: Exclude<HealthStatus, "unknown">;
  latencyMs: number;
  model: string;
  message: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resourceType: "project" | "settings" | "system";
  resourceId: string | null;
  summary: string;
}

export interface ControlCenterSettings {
  retentionDays: number;
  currency: "USD";
  defaultTimeoutMs: number;
  telemetryEnabled: boolean;
}

export interface ControlCenterState {
  version: 1;
  projects: ProjectConfig[];
  events: UsageEvent[];
  healthChecks: HealthCheckResult[];
  auditLog: AuditEvent[];
  settings: ControlCenterSettings;
  updatedAt: string;
}

export interface ProviderExecutionInput {
  project: ProjectConfig;
  prompt: string;
  system?: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface ProviderExecutionResult {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
  statusCode: number;
  raw: unknown;
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
