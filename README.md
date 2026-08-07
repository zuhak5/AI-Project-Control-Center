# HomePilot AI Gateway Console

A private, single-purpose operations console for the AI gateway deployed on the HomePilot Google Cloud VM.

Every model request follows one fixed route:

```text
Vercel console
  -> https://ai.safenetvpn.dedyn.io/v1/responses
  -> Caddy on the Google Cloud VM
  -> Nginx security gateway on 127.0.0.1:8320
  -> CLIProxyAPI on 127.0.0.1:8317
  -> configured upstream AI account
```

The console does not modify the VM, WireGuard, firewall, routes, Caddy, Nginx, or CLIProxyAPI services.

## What the console provides

- GitHub OAuth restricted by `ALLOWED_GITHUB_LOGINS`.
- Canonical-origin OAuth and same-origin protection for browser mutations.
- A fixed gateway playground with no provider selector or custom endpoint entry.
- Separate server-side authentication for the CLIProxyAPI bearer key and Nginx gateway secret.
- Manual and daily scheduled end-to-end health checks using exact normalized response matching.
- Request history with status, latency, token counts, request IDs, and error categories.
- Private Vercel Blob persistence with validation, retention, size limits, and optimistic conflict handling.
- Best-effort telemetry: a storage outage does not discard an otherwise successful AI response.
- Operational settings for health prompt, expected response, timeout, output limit, and retention.
- Sanitized JSON export.
- No prompt, system instruction, full model response, OAuth token, or gateway credential persistence.

## Required Vercel variables

Add these to Production and Preview:

```text
APP_BASE_URL=https://ai-project-control-center.vercel.app
SESSION_SECRET=<random value, at least 32 characters>
ALLOWED_GITHUB_LOGINS=zuhak5
GITHUB_CLIENT_ID=<GitHub OAuth App client ID>
GITHUB_CLIENT_SECRET=<GitHub OAuth App client secret>
CRON_SECRET=<random value, at least 16 characters>
CLIPROXY_API_KEY=<existing CLIProxyAPI bearer key>
HOME_GATEWAY_SECRET=<existing Nginx gateway secret>
GATEWAY_BASE_URL=https://ai.safenetvpn.dedyn.io/v1
GATEWAY_MODEL=gpt-5.6-luna
```

Connect the private Vercel Blob store so `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` is available. Mark all credential values Sensitive. Redeploy after every environment-variable change.

`APP_BASE_URL` is the canonical production origin used for OAuth redirects and same-origin checks. It must use HTTPS and must not contain a path, query, fragment, credentials, or nonstandard port.

The gateway origin is intentionally fixed to the direct Caddy host. The public VM route exposes only `POST /v1/responses`; `/v1/models` and `/v1/chat/completions` remain closed.

## GitHub OAuth App

```text
Homepage URL:               https://ai-project-control-center.vercel.app
Authorization callback URL: https://ai-project-control-center.vercel.app/api/auth/callback
```

## Pages

- `/dashboard` — readiness, current health, metrics, architecture, and latest requests.
- `/playground` — send a prompt through the VM gateway.
- `/health` — run and inspect end-to-end health checks.
- `/events` — inspect sanitized request metadata.
- `/settings` — edit operational health and retention settings.
- `/api/status` — public readiness booleans only; no VM identifiers or secret values.

## Health semantics

A health result is `healthy` only when:

1. the complete gateway call succeeds;
2. the Responses API status is absent or `completed`; and
3. the normalized response text exactly equals the configured expected text.

For example, expected text `OK` does not accept `NOT OK`.

## Security boundaries

- Secrets are read only in Vercel server functions.
- Provider-side response storage is explicitly disabled with `store: false`.
- The gateway origin is restricted to standard HTTPS on `ai.safenetvpn.dedyn.io`.
- The gateway base path must be `/v1`; redirects are rejected.
- Request and stored-state bodies are size-limited.
- Persisted state is runtime-validated and malformed entries are discarded.
- Raw upstream error bodies are not exposed or persisted.
- Browser mutation APIs require the canonical same origin and JSON content type.
- Signed sessions are rechecked against the current GitHub allowlist on every request.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

For local UI work without OAuth:

```text
DEV_BYPASS_AUTH=true
APP_BASE_URL=http://localhost:3000
```

Local state is stored atomically in `.data/homepilot-gateway-state.json` when Vercel Blob is unavailable.

## Validation

```bash
npm install
npm audit --omit=dev --audit-level=high
npm run lint
npm run typecheck
npm test
npm run build
```

CI pins patched PostCSS and sharp transitive versions while retaining the stable Next.js release.

## Operational documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/VERCEL_SETUP.md`](docs/VERCEL_SETUP.md)

## License

MIT. See [`LICENSE`](LICENSE).
