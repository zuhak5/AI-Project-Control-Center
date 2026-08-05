# Operations

## Normal operation

1. Open the stable Vercel production domain.
2. Sign in with an allowlisted GitHub account.
3. Confirm all readiness booleans are true at `/api/status`.
4. Run a manual health check.
5. Use the playground for an authenticated end-to-end request.

## Health interpretation

A check is `healthy` only when the gateway succeeds and its normalized response exactly equals the configured expected text. A successful HTTP request with different text is `degraded`. A transport, credential, timeout, route, or upstream failure is `down`.

## Failure interpretation

| Symptom or category | Likely area |
|---|---|
| `gateway_secret_missing` | Vercel gateway credential configuration |
| `gateway_authentication_failed` | Nginx gateway secret or CLIProxyAPI bearer key rejected |
| `gateway_route_not_found` | zrok target, Nginx route, or `/v1/responses` mismatch |
| `upstream_rate_limited` | upstream account rate limit |
| `gateway_or_upstream_unavailable` | zrok, Nginx, CLIProxyAPI, or upstream outage |
| `gateway_timeout` | endpoint unavailable or upstream request stalled |
| `gateway_invalid_json` | proxy returned HTML/text instead of Responses API JSON |
| `gateway_empty_output` | successful payload contained no assistant text |
| `storage_read_failed` | Blob connection, token/OIDC, or stored object unavailable |
| `storage_write_failed` | Blob write failed or deployment lost storage access |
| telemetry warning after success | AI response succeeded, but sanitized metadata was not persisted |
| `cross_origin_request` | request did not originate from `APP_BASE_URL` |
| OAuth redirect mismatch | `APP_BASE_URL` and GitHub OAuth callback differ |

## Storage recovery

Gateway execution and health probes use safe default operational settings when state cannot be read. Successful model output is still returned when telemetry persistence fails. Settings changes remain fail-closed because they require durable storage.

After restoring the Blob connection:

1. Redeploy Production.
2. Confirm `storageConfigured: true` at `/api/status`.
3. Run a manual health check.
4. Confirm the new result appears under `/health` and `/events`.

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

Removing a GitHub login from `ALLOWED_GITHUB_LOGINS` invalidates that user's signed session on their next request.
