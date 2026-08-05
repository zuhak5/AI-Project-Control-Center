# Contributing

This repository is intentionally single-purpose. Changes must preserve the fixed HomePilot Google Cloud VM gateway architecture.

Before submitting changes:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Do not add arbitrary provider URLs, provider selectors, client-side secrets, prompt persistence, or direct browser access to the zrok endpoint. Keep all gateway calls server-side.
