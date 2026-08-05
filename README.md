# HomePilot AI Gateway Console

A private, single-purpose operations console for the AI gateway deployed on the HomePilot Google Cloud VM.

This repository no longer manages arbitrary AI projects or direct provider connections. Every request is routed through the verified gateway path:

```text
Vercel console
  -> https://homepilot-ai.shares.zrok.io/v1/responses
  -> zrok reserved public share
  -> Nginx security gateway on 127.0.0.1:8320
  -> CLIProxyAPI on 127.0.0.1:8317
  -> configured upstream AI account
```

## Fixed infrastructure

| Layer | Value |
|---|---|
| Google Cloud project | `myvpn-498108` |
| VM | `my-vpn-us-east1-20260601` |
| Zone | `us-east1-b` |
| VM public IP | `35.207.5.160` |
| Public gateway | `https://homepilot-ai.shares.zrok.io` |
| Nginx security gateway | `127.0.0.1:8320` |
| CLIProxyAPI | `127.0.0.1:8317` |
| Responses endpoint | `/v1/responses` |

The console does not modify the VM, WireGuard, firewall, routes, Caddy, zrok reservation, Nginx, or CLIProxyAPI services.

## What the console provides

- GitHub OAuth restricted by `ALLOWED_GITHUB_LOGINS`.
- A fixed gateway playground; no provider selector and no custom endpoint entry.
- Separate server-side authentication for the CLIProxyAPI bearer key and Nginx gateway secret.
- Manual and daily scheduled end-to-end health checks.
- Request history with status, latency, token counts, request IDs, and error categories.
- A topology view for Vercel, zrok, Nginx, CLIProxyAPI, and upstream AI.
- Private Vercel Blob persistence with conditional-write conflict handling.
- Operational settings for health prompt, expected response, timeout, output limit, and retention.
- Sanitized JSON export.
- No prompt or full response persistence.

## Required Vercel variables

Add these to Production and Preview:

```text
SESSION_SECRET=<random value, at least 32 characters>
ALLOWED_GITHUB_LOGINS=zuhak5
GITHUB_CLIENT_ID=<GitHub OAuth App client ID>
GITHUB_CLIENT_SECRET=<GitHub OAuth App client secret>
CRON_SECRET=<random value, at least 16 characters>
CLIPROXY_API_KEY=<existing CLIProxyAPI bearer key>
HOME_GATEWAY_SECRET=<existing Nginx gateway secret>
GATEWAY_BASE_URL=https://homepilot-ai.shares.zrok.io/v1
GATEWAY_MODEL=gpt-5.4-mini
```

Connect a private Vercel Blob store so either `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` is available. Mark `CLIPROXY_API_KEY`, `HOME_GATEWAY_SECRET`, `SESSION_SECRET`, `GITHUB_CLIENT_SECRET`, and `CRON_SECRET` as Sensitive.

After every environment-variable change, redeploy Production.

## GitHub OAuth App

Use the stable production domain:

```text
Homepage URL:               https://ai-project-control-center.vercel.app
Authorization callback URL: https://ai-project-control-center.vercel.app/api/auth/callback
```

## Pages

- `/dashboard` — gateway readiness, current health, metrics, architecture, and latest requests.
- `/playground` — send a prompt through the VM gateway.
- `/health` — run and inspect end-to-end health checks.
- `/events` — inspect sanitized request metadata.
- `/settings` — edit operational health and retention settings.
- `/api/status` — public deployment-readiness booleans; never exposes secret values.

## Health checks

The daily Vercel Cron calls `/api/cron/health` at 05:00 UTC. A successful check proves the complete request path responded and the expected text was found. It does not independently query systemd services on the VM.

## Security boundaries

- Secrets are read only in Vercel server functions.
- The browser never receives the CLIProxyAPI key or gateway secret.
- The gateway hostname is restricted to `homepilot-ai.shares.zrok.io`.
- The gateway base path must be `/v1`.
- Provider responses are size-limited.
- Redirects are rejected.
- Stored events do not contain prompts or full model responses.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

For local UI work without OAuth:

```text
DEV_BYPASS_AUTH=true
```

Local state is stored in `.data/homepilot-gateway-state.json` when Vercel Blob is unavailable.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Operational documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/VERCEL_SETUP.md`](docs/VERCEL_SETUP.md)

## License

MIT. See [`LICENSE`](LICENSE).
