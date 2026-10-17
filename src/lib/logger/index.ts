export type LogLevel = "info" | "warn" | "error";

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  context?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|key|authorization|cookie|service_role|hash|credential/i;

/**
 * Recursively redacts sensitive fields from log context objects so credentials,
 * invitation tokens, session cookies, and service-role keys are never written to stdout/stderr.
 */
export function redactSensitiveFields(
  input: unknown,
  depth = 0
): unknown {
  if (depth > 5 || input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveFields(item, depth + 1));
  }

  if (typeof input === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      input as Record<string, unknown>
    )) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = redactSensitiveFields(value, depth + 1);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * Formats a structured JSON log payload safe for production ingestion (e.g., Vercel Logs).
 */
export function createLogEntry(
  level: LogLevel,
  event: string,
  context?: Record<string, unknown>
): StructuredLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(context
      ? {
          context: redactSensitiveFields(context) as Record<string, unknown>,
        }
      : {}),
  };
}

export const logger = {
  info(event: string, context?: Record<string, unknown>): StructuredLogEntry {
    const entry = createLogEntry("info", event, context);
    if (process.env.NODE_ENV !== "test") {
      console.info(JSON.stringify(entry));
    }
    return entry;
  },
  warn(event: string, context?: Record<string, unknown>): StructuredLogEntry {
    const entry = createLogEntry("warn", event, context);
    if (process.env.NODE_ENV !== "test") {
      console.warn(JSON.stringify(entry));
    }
    return entry;
  },
  error(event: string, context?: Record<string, unknown>): StructuredLogEntry {
    const entry = createLogEntry("error", event, context);
    if (process.env.NODE_ENV !== "test") {
      console.error(JSON.stringify(entry));
    }
    return entry;
  },
};
