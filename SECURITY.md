# Security policy

## Scope

This application is a private operator console for one fixed Google Cloud VM gateway. It must not accept arbitrary provider URLs, browser-supplied credentials, or noncanonical OAuth origins.

## Secrets

The following values belong only in Vercel Sensitive environment variables:

- `CLIPROXY_API_KEY`
- `HOME_GATEWAY_SECRET`
- `SESSION_SECRET`
- `GITHUB_CLIENT_SECRET`
- `CRON_SECRET`
- `BLOB_READ_WRITE_TOKEN`

Never commit, log, export, or paste these values into issues or chat messages. Gateway secrets are trimmed and rejected if they contain line breaks.

## Authentication and browser requests

- OAuth redirects use `APP_BASE_URL`, not request host headers.
- The OAuth callback state cookie is HTTP-only, SameSite=Lax, short-lived, and single-use.
- Signed sessions have a bounded lifetime and are rechecked against `ALLOWED_GITHUB_LOGINS` on every request.
- Playground, health, settings, and logout mutations require the canonical same origin.
- JSON APIs require an appropriate JSON media type and bounded UTF-8 body size.

## Gateway restrictions

The server validates that the gateway:

- uses standard-port HTTPS;
- has hostname `ai.safenetvpn.dedyn.io`;
- uses base path `/v1`;
- contains no user information, query parameters, or fragments;
- does not follow redirects;
- returns a bounded JSON success body.

The public Caddy origin itself is hardened to route only `POST /v1/responses`; `/v1/models`, `/v1/chat/completions`, and unrelated paths are not exposed to this application.

Requests set `store: false`. Raw upstream error bodies are not returned to the browser or written to telemetry.

## Stored data

The Blob state contains settings, health checks, audit events, and sanitized request metadata. It does not contain prompts, system instructions, full responses, OAuth tokens, or gateway credentials.

Stored state is bounded and runtime-validated before use. Invalid records are discarded, timestamps are normalized, duplicate IDs are removed, and retention limits are applied. Local development writes use an atomic temporary-file rename.

## Dependency and build controls

CI performs a high-severity production dependency audit, lint with zero warnings, strict TypeScript checking, unit tests, and a production Next.js build. Patched PostCSS and sharp transitive versions are explicitly pinned while the application remains on stable Next.js.

## Reporting

Report suspected credential exposure privately. Rotate the affected value before investigating application logs or repository history.
