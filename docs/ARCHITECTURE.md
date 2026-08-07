# Architecture

## End-to-end request path

```text
Authenticated browser
  -> Vercel Next.js route handler
  -> HTTPS POST https://ai.safenetvpn.dedyn.io/v1/responses
       Authorization: Bearer <CLIPROXY_API_KEY>
       X-HomePilot-Gateway-Secret: <HOME_GATEWAY_SECRET>
  -> Caddy on the Google Cloud VM
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
3. **Caddy:** public TLS ingress on `ai.safenetvpn.dedyn.io`; only the exact `/v1/responses` path is routed to the AI gateway.
4. **Nginx:** requires the gateway secret and permits the intended Responses request shape.
5. **CLIProxyAPI:** requires its bearer key and handles upstream authentication.
6. **Upstream AI account:** generates the model response.

## Fixed configuration

The code rejects any gateway hostname other than `ai.safenetvpn.dedyn.io` and any base path other than `/v1`. `GATEWAY_BASE_URL` exists only to make deployment configuration explicit and to detect accidental drift.

The public Caddy site intentionally returns `404` for `/v1/models` and `/v1/chat/completions`; the console uses only `POST /v1/responses`.

## Persistence

The console stores a bounded version-2 state document at:

```text
homepilot-ai-gateway-console/state.json
```

A new path intentionally isolates this single-gateway console from the earlier multi-project state document.
