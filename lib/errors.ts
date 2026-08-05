export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = "internal_error"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ProviderError extends AppError {
  constructor(
    message: string,
    statusCode = 502,
    code = "provider_error",
    public readonly upstreamStatus: number | null = null
  ) {
    super(message, statusCode, code);
    this.name = "ProviderError";
  }
}

export function publicError(error: unknown): { message: string; code: string; statusCode: number } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code, statusCode: error.statusCode };
  }

  console.error(error);
  return { message: "Unexpected server error.", code: "internal_error", statusCode: 500 };
}
