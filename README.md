# AI Project Control Center

A production-oriented operations dashboard for AI-enabled projects. The application is intentionally independent from any one product: source and change history live in GitHub, while the web application, server functions, private state, environment secrets, and scheduled checks run on Vercel.

## What it provides

- GitHub OAuth with an explicit owner allowlist.
- A reusable project registry for OpenAI Responses, Anthropic Messages, Gemini Generate Content, and custom JSON providers.
- Provider credentials referenced by Vercel environment-variable name; secret values are never stored in project records or sent to browser JavaScript.
- A server-side AI playground with model allowlists, timeouts, bounded provider responses, request IDs, usage metadata, and raw JSON inspection.
- Manual and scheduled health checks.
- Project-scoped telemetry ingestion tokens stored only as SHA-256 hashes.
- Request, token, latency, status, error-category, and reported-spend dashboards.
- Private Vercel Blob persistence with conditional-write conflict handling.
- Administrative audit history and sanitized JSON exports.
- SSRF controls: HTTPS enforcement, loopback/private-address blocking, and optional provider-host allowlisting.

## Architecture

```text
GitHub repository
  └── source, CI, review history

Vercel deployment
  ├── Next.js dashboard
  ├── GitHub OAuth callback and signed HTTP-only sessions
  ├── server-side provider adapters
  ├── protected telemetry API
  ├── daily health-check cron
  ├── encrypted environment variables
  └── private Vercel Blob state
          │
          ├── OpenAI-compatible / OpenAI Responses endpoints
          ├── Anthropic Messages endpoints
          ├── Google Gemini endpoints
          └── custom HTTPS JSON endpoints
```

The dashboard does not require Supabase, Firebase, Auth0, or a separate database.

## Security boundaries

The browser receives project metadata and sanitized operational information, but never provider API keys, GitHub OAuth client secrets, session-signing secrets, cron secrets, Blob tokens, or telemetry-token hashes.

Project records store an environment-variable reference such as `OPENAI_API_KEY`. The corresponding value must be configured in Vercel. Provider requests occur only in Vercel Functions.

The repository may be public. Access to the deployed dashboard remains restricted by GitHub OAuth and `ALLOWED_GITHUB_LOGINS`. A private repository is still recommended if project names, endpoints, or operational conventions are sensitive.

## Deploy to Vercel

### 1. Import the repository

In Vercel, create a project and import this GitHub repository. Keep the framework preset as **Next.js**.

### 2. Create a private Blob store

In the Vercel project:

1. Open **Storage**.
2. Create a **Blob** store.
3. Select **Private** access.
4. Connect it to Production, Preview, and Development as appropriate.

Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.

### 3. Create a GitHub OAuth App

In GitHub account settings, create an OAuth App with:

```text
Homepage URL:               https://YOUR-VERCEL-DOMAIN
Authorization callback URL: https://YOUR-VERCEL-DOMAIN/api/auth/callback
```

Copy the client ID and generate a client secret. Add both to Vercel as encrypted environment variables:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

### 4. Configure required Vercel variables

```text
SESSION_SECRET=<random value of at least 32 characters>
ALLOWED_GITHUB_LOGINS=zuhak5
CRON_SECRET=<random value of at least 16 characters>
```

Generate secrets locally, for example:

```bash
openssl rand -base64 48
```

Do not prefix private values with `NEXT_PUBLIC_`.

### 5. Restrict outbound provider hosts

Recommended production setting:

```text
AICC_ALLOWED_PROVIDER_HOSTS=api.openai.com,api.anthropic.com,generativelanguage.googleapis.com
```

Add custom provider hostnames before registering those projects. When the allowlist is non-empty, all other hosts are rejected.

`AICC_ALLOW_HTTP_PROVIDERS=true` is honored only outside production and exists for local development. Production provider URLs must use HTTPS.

### 6. Add provider credentials

Add provider keys to Vercel using names such as:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
```

The dashboard stores only these names. After changing an environment variable, redeploy so the new value is available to the deployment.

### 7. Deploy

Trigger a production deployment. Then sign in using a GitHub account listed in `ALLOWED_GITHUB_LOGINS`.

The included Vercel Cron runs `/api/cron/health` daily at 05:00 UTC. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

For local-only development without OAuth:

```text
DEV_BYPASS_AUTH=true
```

This bypass is ignored in production.

Without `BLOB_READ_WRITE_TOKEN`, local state is written to `.data/state.json`. That directory is ignored by Git.

## Registering a project

Open **Projects → Add project** and provide:

- project name and environment;
- provider adapter;
- provider base URL or exact custom endpoint;
- Vercel environment-variable name containing the API key;
- default and allowed models;
- optional monthly budget;
- health prompt and expected response text;
- telemetry-ingestion preference.

When telemetry is enabled, the dashboard displays an ingest token exactly once. Store it in the sending project's secret manager.

## Telemetry ingestion

Projects can submit sanitized usage events without giving the dashboard access to application prompts or responses.

```bash
curl -X POST 'https://YOUR-DASHBOARD/api/ingest/PROJECT_ID' \
  -H 'Content-Type: application/json' \
  -H 'X-AICC-Ingest-Token: PROJECT_TOKEN' \
  -d '{
    "status": "success",
    "statusCode": 200,
    "model": "model-name",
    "latencyMs": 850,
    "inputTokens": 120,
    "outputTokens": 40,
    "estimatedCostUsd": 0.0012,
    "requestId": "provider-request-id"
  }'
```

Accepted telemetry fields are documented in [`docs/TELEMETRY.md`](docs/TELEMETRY.md).

## Provider behavior

Provider adapter contracts and custom JSON response recognition are documented in [`docs/PROVIDERS.md`](docs/PROVIDERS.md).

## Operational limitations

- Vercel Blob is object storage, not a relational analytics database. The application keeps a bounded state document and is designed for a private owner-operated portfolio, not high-volume multi-tenant telemetry.
- Telemetry ingestion uses project-scoped bearer tokens but does not implement durable distributed rate limiting. Apply Vercel Firewall rules for internet-facing high-volume deployments.
- Estimated cost is accepted from project telemetry and defaults to zero for direct playground and health-check requests. Provider billing APIs vary and are not queried automatically.
- The Hobby plan schedules cron jobs at most once per day and with hourly precision. Paid plans support more frequent checks.
- A provider hostname allowlist is strongly recommended. DNS-level rebinding defenses remain a platform/network concern.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## License

MIT. See [`LICENSE`](LICENSE).
