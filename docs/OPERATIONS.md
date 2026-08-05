# Operations

## Normal operation

1. Open the Vercel production domain.
2. Sign in with an allowlisted GitHub account.
3. Confirm all readiness checks are green on the dashboard.
4. Run a manual health check.
5. Use the playground for an authenticated end-to-end request.

## Failure interpretation

| Symptom | Likely area |
|---|---|
| `HOME_GATEWAY_SECRET` missing | Vercel environment configuration |
| `CLIPROXY_API_KEY` missing | Vercel environment configuration |
| HTTP 401 | Nginx gateway secret or CLIProxyAPI bearer key rejected |
| HTTP 404 | zrok target, Nginx route, or endpoint path mismatch |
| HTTP 405/415 | request method or content-type policy mismatch |
| HTTP 429 | upstream account rate limit |
| HTTP 5xx | zrok, Nginx, CLIProxyAPI, or upstream failure |
| timeout | endpoint unavailable or upstream request stalled |
| response text missing | upstream response schema changed or request failed semantically |

## VM services already configured

- `cliproxyapi.service` — enabled and active on `127.0.0.1:8317`.
- Nginx security gateway — enabled and active on `127.0.0.1:8320`.
- zrok agent/share — enabled and active for `homepilot-ai.shares.zrok.io`.

This repository does not execute VM administration commands. VM changes require a separate, explicitly authorized maintenance procedure.

## Credential rotation

When rotating either gateway credential:

1. Update the corresponding service on the VM.
2. Update the Vercel Sensitive environment variable.
3. Redeploy Production.
4. Run a manual health check.
5. Confirm the old credential no longer works.
