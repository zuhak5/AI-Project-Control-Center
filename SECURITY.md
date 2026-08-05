# Security policy

## Scope

This application is a private operator console for one fixed Google Cloud VM gateway. It must not be repurposed to accept arbitrary provider URLs or browser-supplied credentials.

## Secrets

The following values belong only in Vercel encrypted environment variables:

- `CLIPROXY_API_KEY`
- `HOME_GATEWAY_SECRET`
- `SESSION_SECRET`
- `GITHUB_CLIENT_SECRET`
- `CRON_SECRET`
- `BLOB_READ_WRITE_TOKEN`

Never commit, log, export, or paste these values into issues or chat messages.

## Request restrictions

The server validates that the configured gateway:

- uses HTTPS;
- has hostname `homepilot-ai.shares.zrok.io`;
- uses base path `/v1`;
- does not include user information, query parameters, or fragments;
- does not follow redirects;
- returns a bounded response body.

## Stored data

The Blob state contains settings, health checks, audit events, and sanitized request metadata. Prompts, system instructions, full responses, OAuth tokens, and gateway credentials are not stored.

## Reporting

Report suspected credential exposure privately. Rotate the affected value before investigating application logs or repository history.
