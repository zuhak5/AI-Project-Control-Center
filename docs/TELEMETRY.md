# Telemetry ingestion

## Endpoint

```text
POST /api/ingest/{projectId}
```

## Authentication

```http
X-AICC-Ingest-Token: <project-scoped-token>
```

Only the SHA-256 hash of the token is retained. Rotating the token invalidates the previous value immediately.

## Body

```json
{
  "timestamp": "2026-08-05T14:00:00.000Z",
  "status": "success",
  "statusCode": 200,
  "model": "provider-model-name",
  "latencyMs": 850,
  "inputTokens": 120,
  "outputTokens": 40,
  "estimatedCostUsd": 0.0012,
  "requestId": "provider-request-id",
  "errorCategory": null,
  "note": "optional sanitized note"
}
```

Required fields:

- `status`
- `latencyMs`

The timestamp defaults to receipt time. Token counts and estimated cost default to zero. Inputs are bounded and validated.

## Privacy

Do not place prompts, responses, API keys, customer data, authorization headers, stack traces, or personal information in `note`, `requestId`, or `errorCategory`. The endpoint is intentionally limited to operational metadata.

## Recommended integration pattern

Create a small asynchronous telemetry helper in each sending project. Submit the event after the provider request completes. Telemetry failure should not fail the user-facing AI request.

Use a short request timeout and omit the event if the dashboard is unavailable. Do not retry indefinitely.
