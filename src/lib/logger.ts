// lib/logger.ts — Structured logging for production monitoring
// Replaces scattered console.log/warn/error with consistent, filterable output.

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: string;
}

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ""} ${entry.message}`;
  if (entry.data) return `${base} ${JSON.stringify(entry.data)}`;
  if (entry.error) return `${base} error=${entry.error}`;
  return base;
}

function createLogger(context?: string) {
  function log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
      error: error instanceof Error ? error.message : typeof error === "string" ? error : undefined,
    };

    const formatted = formatEntry(entry);

    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>, err?: unknown) => log("error", msg, data, err),
  };
}

// Pre-configured loggers for common contexts
export const logger = createLogger();
export const apiLogger = createLogger("api");
export const dbLogger = createLogger("db");
export const authLogger = createLogger("auth");
export const orderLogger = createLogger("orders");
export const telegramLogger = createLogger("telegram");
export const r2Logger = createLogger("r2");

export { createLogger };
