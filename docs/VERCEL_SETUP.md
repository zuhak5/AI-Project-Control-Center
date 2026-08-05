# Vercel setup

## Storage

Connect the private Blob store `ai-project-control-center-blob` to Production and Preview. The console recognizes either the connected OIDC store ID or a read-write token.

## Required variables

```text
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

## OAuth callback

```text
https://ai-project-control-center.vercel.app/api/auth/callback
```

## Verification

After redeployment, open:

```text
https://ai-project-control-center.vercel.app/api/status
```

Expected readiness fields:

```json
{
  "storageConfigured": true,
  "githubOAuthConfigured": true,
  "gatewayConfigured": true,
  "gatewayUrlValid": true
}
```

Then sign in and run a manual health check from `/health`.
