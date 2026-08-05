# Contributing

1. Create a focused branch.
2. Do not commit secrets or production telemetry.
3. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
4. Describe security and data-retention effects in the pull request.
5. Add tests for provider parsers, authentication primitives, state mutation, and validation changes.

New provider adapters must preserve the existing secret boundary and outbound URL controls.
