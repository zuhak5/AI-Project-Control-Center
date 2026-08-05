# Provider adapters

## OpenAI Responses

Base URL example:

```text
https://api.openai.com/v1
```

The adapter calls `POST /responses` and sends a bearer token. It recognizes `output_text`, Responses API output content, and legacy `choices` text as a compatibility fallback.

## Anthropic Messages

Base URL example:

```text
https://api.anthropic.com/v1
```

The adapter calls `POST /messages`, sends `x-api-key`, and sets `anthropic-version: 2023-06-01`.

## Gemini Generate Content

Base URL example:

```text
https://generativelanguage.googleapis.com/v1beta
```

The adapter calls `POST /models/{model}:generateContent` and sends the API key in the `x-goog-api-key` header. The key remains server-side and is never returned to the browser or stored in Blob.

## Custom JSON

For this adapter, the configured base URL is treated as the complete HTTPS endpoint. The request body is:

```json
{
  "model": "configured-model",
  "prompt": "user prompt",
  "system": "optional instructions",
  "max_output_tokens": 800,
  "temperature": 0.2
}
```

Authentication uses `Authorization: Bearer <secret>`.

The response parser recognizes the first non-empty text value among:

- `output_text`
- `output`
- `text`
- `message`
- `data.text`
- OpenAI-style output or choices

Token usage is read from `usage.input_tokens`, `usage.output_tokens`, `usage.prompt_tokens`, or `usage.completion_tokens` when present.

## Adding an adapter

1. Extend `ProviderKind` in `lib/types.ts`.
2. Extend validation and the project form.
3. Add a server-only adapter in `lib/providers/index.ts`.
4. Normalize output to `ProviderExecutionResult`.
5. Add parser and error tests.
6. Update the provider documentation and default host allowlist instructions.
