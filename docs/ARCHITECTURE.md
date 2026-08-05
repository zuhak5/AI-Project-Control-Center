# Architecture

## Trust zones

### Browser

The browser renders the operator interface and sends authenticated requests to same-origin Next.js Route Handlers. It receives sanitized project configuration, health results, telemetry, and provider responses requested through the playground. It never receives provider secrets or stored telemetry-token hashes.

### Vercel Functions

Vercel Functions terminate the GitHub OAuth flow, verify signed sessions, validate request bodies with Zod, enforce project model allowlists, resolve provider-secret environment variables, perform outbound provider calls, sanitize errors, and write private operational state.

### Private Vercel Blob

The application stores one bounded JSON state document at `ai-project-control-center/state.json`. Reads and writes require `BLOB_READ_WRITE_TOKEN`. Writes use an ETag when available and retry conflicts.

### External provider endpoints

Provider calls require HTTPS in production. Literal private IPs, loopback names, link-local ranges, and `.local` names are rejected. `AICC_ALLOWED_PROVIDER_HOSTS` can impose an exact hostname allowlist.

## Authentication

1. `/api/auth/login` creates a high-entropy OAuth state cookie and redirects to GitHub.
2. `/api/auth/callback` validates state and exchanges the authorization code server-side.
3. GitHub user data is checked against `ALLOWED_GITHUB_LOGINS`.
4. A compact signed session payload is stored in an HTTP-only, Secure, SameSite=Lax cookie.
5. Protected pages and APIs verify the signature and expiry on every request.

No GitHub access token is retained after login.

## Storage model

The bounded state document contains:

- project configuration;
- sanitized usage events;
- health-check results;
- administrative audit events;
- global retention and telemetry settings.

Event retention is configurable. Additional hard caps prevent unbounded object growth.

## Provider adapters

Adapters share a normalized execution result:

```ts
interface ProviderExecutionResult {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
  statusCode: number;
  raw: unknown;
}
```

All provider responses are read through a bounded streaming reader before JSON parsing. Redirects are rejected, fetch caching is disabled, and requests use an abort timeout.

## Scheduled health checks

`vercel.json` invokes `/api/cron/health`. The route requires the exact `Authorization: Bearer <CRON_SECRET>` header. It checks enabled projects sequentially to control provider concurrency and writes both a health result and an operational event.
