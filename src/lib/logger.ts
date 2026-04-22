type LogLevel = "debug" | "info" | "warn" | "error";

type LogPrimitive = string | number | boolean | null | undefined;
type LogValue = LogPrimitive | LogPrimitive[] | Record<string, unknown> | unknown[];

export type LogContext = Record<string, LogValue> & {
  requestId?: string;
  route?: string;
  method?: string;
  event?: string;
};

const APP_NAME = "namuh-mintlify";

function safeSerializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function emit(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    level,
    message,
    app: APP_NAME,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const line = JSON.stringify(payload);

  switch (level) {
    case "debug":
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export function createRequestId() {
  return crypto.randomUUID();
}

export const logger = {
  debug(message: string, context?: LogContext) {
    emit("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context);
  },
  error(message: string, context?: LogContext & { error?: unknown }) {
    const nextContext = { ...context };
    if (nextContext.error !== undefined) {
      nextContext.error = safeSerializeError(nextContext.error);
    }
    emit("error", message, nextContext);
  },
};
