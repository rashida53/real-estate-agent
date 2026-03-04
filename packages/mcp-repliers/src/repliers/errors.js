// Error helpers for the Repliers MCP abstraction.

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  API_KEY_MISSING: "API_KEY_MISSING",
  API_KEY_INVALID: "API_KEY_INVALID",
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INVALID_RESPONSE: "INVALID_RESPONSE",
};

export function createError(code, message, meta) {
  const error = new Error(message);
  error.name = code;
  error.mcpError = {
    error: true,
    code,
    message,
    ...(meta || {}),
  };
  return error;
}

export function toStructuredError(err, fallbackCode = ERROR_CODES.UPSTREAM_ERROR) {
  if (err && err.mcpError) {
    return err.mcpError;
  }

  return {
    error: true,
    code: fallbackCode,
    message: err && err.message ? err.message : "Unknown error",
  };
}

