# Architecture

## End-to-end request path

```text
Authenticated browser
  -> Vercel Next.js route handler
  -> HTTPS POST https://homepilot-ai.shares.zrok.io/v1/responses
       Authorization: Bearer <CLIPROXY_API_KEY>
       X-HomePilot-Gateway-Secret: <HOME_GATEWAY_SECRET>
  -> zrok reserved share
  -> Nginx on VM loopback 127.0.0.1:8320
  -> CLIProxyAPI on VM loopback 127.0.0.1:8317
  -> upstream AI provider/account
  -> response returned to Vercel
  -> sanitized metadata persisted to private Vercel Blob
  -> full response returned to authenticated browser
```

## Trust boundaries

1. **Browser:** authenticated operator UI. It never receives infrastructure secrets.
2. **Vercel:** session validation, request validation, gateway authentication, persistence, scheduled checks.
3. **zrok:** public ingress for one reserved share.
4. **Nginx:** requires the gateway secret and permits the intended Responses request shape.
5. **CLIProxyAPI:** requires its bearer key and handles upstream authentication.
6. **Upstream AI account:** generates the model response.

## Fixed configuration

The code rejects any gateway hostname other than `homepilot-ai.shares.zrok.io` and any base path other than `/v1`. `GATEWAY_BASE_URL` exists only to make deployment configuration explicit and to detect accidental drift.

## Persistence

The console stores a bounded version-2 state document at:

```text
homepilot-ai-gateway-console/state.json
```

A new path intentionally isolates this single-gateway console from the earlier multi-project state document.
