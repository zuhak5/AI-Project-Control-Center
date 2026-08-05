# Security policy

## Reporting a vulnerability

Do not disclose security vulnerabilities in a public issue. Contact the repository owner privately with the affected commit, reproduction steps, impact, and suggested mitigation.

## Secret handling

Never commit:

- provider API keys;
- GitHub OAuth client secrets;
- `SESSION_SECRET`;
- `CRON_SECRET`;
- `BLOB_READ_WRITE_TOKEN`;
- telemetry ingest tokens;
- `.env` files containing values.

The application stores provider environment-variable names, not their values. Telemetry tokens are displayed once and retained only as hashes.

## Production checklist

- Use a private Vercel Blob store.
- Set an exact `ALLOWED_GITHUB_LOGINS` list.
- Generate a session secret with at least 32 random bytes.
- Configure `AICC_ALLOWED_PROVIDER_HOSTS`.
- Keep Vercel Git fork protection enabled.
- Review Vercel Firewall and rate-limiting options before exposing high-volume telemetry endpoints.
- Do not enable `DEV_BYPASS_AUTH` in production; production ignores it regardless.
- Rotate provider keys after suspected disclosure and redeploy.
