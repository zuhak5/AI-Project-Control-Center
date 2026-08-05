# Google Cloud CLIProxyAPI gateway

The control center can use the verified gateway deployed on the Google Cloud VM without changing the VM configuration.

## Request path

```text
Vercel control center
  -> https://homepilot-ai.shares.zrok.io/v1/responses
  -> zrok reserved share
  -> Nginx security gateway
  -> CLIProxyAPI
  -> upstream AI provider
```

The OpenAI Responses adapter supplies the CLIProxyAPI bearer key. The shared HTTP layer automatically adds `X-HomePilot-Gateway-Secret` only when the destination hostname is exactly `homepilot-ai.shares.zrok.io`.

## Vercel variables

Add these variables to Production and Preview, then redeploy:

```text
CLIPROXY_API_KEY=<existing CLIProxyAPI bearer key>
HOME_GATEWAY_SECRET=<existing Nginx gateway secret>
AICC_ALLOWED_PROVIDER_HOSTS=api.openai.com,api.anthropic.com,generativelanguage.googleapis.com,homepilot-ai.shares.zrok.io
```

Keep both secret values marked Sensitive. Do not commit either value.

## Dashboard project

Create an OpenAI Responses project with:

```text
Project name: Google Cloud CLIProxyAPI Gateway
Environment: Production
Provider adapter: OpenAI Responses
Provider base URL: https://homepilot-ai.shares.zrok.io/v1
Vercel secret variable name: CLIPROXY_API_KEY
Default model: gpt-5.4-mini
Allowed models: gpt-5.4-mini
Health prompt: Reply with exactly: OK
Expected text: OK
Timeout: 30000
```

The adapter appends `/responses`, preserves `Authorization: Bearer <CLIPROXY_API_KEY>`, and injects the separate gateway-secret header on the server. No secret reaches the browser or project record.

## Storage

The state store recognizes either `BLOB_READ_WRITE_TOKEN` or Vercel OIDC through `BLOB_STORE_ID`. On Vercel, project creation fails with an explicit storage error when no private Blob store is connected instead of silently using ephemeral filesystem state.
