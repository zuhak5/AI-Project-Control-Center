# Vercel setup

## Storage

Connect the private Blob store `ai-project-control-center-blob` to Production and Preview. The console recognizes either the connected OIDC store ID or a read-write token.

## Required variables

```text
APP_BASE_URL=https://ai-project-control-center.vercel.app
SESSION_SECRET
ALLOWED_GITHUB_LOGINS=zuhak5
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
CRON_SECRET
CLIPROXY_API_KEY
HOME_GATEWAY_SECRET
GATEWAY_BASE_URL=https://homepilot-ai.shares.zrok.io/v1
GATEWAY_MODEL=gpt-5.4-mini
```

`APP_BASE_URL` is the canonical origin for OAuth callbacks, post-authentication redirects, logout, and browser mutation checks. It must exactly match the stable production domain and must not contain a trailing path, query, fragment, credentials, or nonstandard port.

Mark `SESSION_SECRET`, `GITHUB_CLIENT_SECRET`, `CRON_SECRET`, `CLIPROXY_API_KEY`, `HOME_GATEWAY_SECRET`, and `BLOB_READ_WRITE_TOKEN` as Sensitive. Apply the variables to Production and Preview, then redeploy both environments.

## OAuth application

```text
Homepage URL:               https://ai-project-control-center.vercel.app
Authorization callback URL: https://ai-project-control-center.vercel.app/api/auth/callback
```

Preview deployments still redirect OAuth through the canonical production callback. Use the production domain for operator sign-in and live validation.

## Verification

Open:

```text
https://ai-project-control-center.vercel.app/api/status
```

Expected readiness fields:

```json
{
  "storageConfigured": true,
  "appUrlValid": true,
  "githubOAuthConfigured": true,
  "allowlistConfigured": true,
  "cronConfigured": true,
  "gatewayConfigured": true,
  "gatewayUrlValid": true,
  "gatewayModelValid": true
}
```

The status endpoint intentionally omits VM identifiers, gateway host details, storage mode, and secret values.

Then:

1. Sign in through the production domain.
2. Run a manual check from `/health`.
3. Confirm the result is `healthy` only when the returned text exactly matches the configured expected text after whitespace and case normalization.
4. Run a playground request.
5. Confirm a telemetry-storage warning does not hide an otherwise successful AI response.
