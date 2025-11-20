/**
 * Client-safe logger for browser environments
 *
 * This is a lightweight wrapper that uses console in the browser
 * and falls back safely when pino is not available.
 */

type LogFunction = (obj: object | string, msg?: string) => void;

interface ClientLogger {
  trace: LogFunction;
  debug: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
  fatal: LogFunction;
}

// Helper to format log messages for console
function formatLog(obj: object | string, msg?: string): [string, object?] {
  if (typeof obj === "string") {
    return [obj];
  }
  return [msg || "Log", obj];
}

// Browser-safe logger using console
export const log: ClientLogger = {
  trace: (obj, msg) => {
    const [message, data] = formatLog(obj, msg);
    if (data) {
      console.debug(`[TRACE] ${message}`, data);
    } else {
      console.debug(`[TRACE] ${message}`);
    }
  },

  debug: (obj, msg) => {
    const [message, data] = formatLog(obj, msg);
    if (data) {
      console.debug(`[DEBUG] ${message}`, data);
    } else {
      console.debug(`[DEBUG] ${message}`);
    }
  },

  info: (obj, msg) => {
    const [message, data] = formatLog(obj, msg);
    if (data) {
      console.info(`[INFO] ${message}`, data);
    } else {
      console.info(`[INFO] ${message}`);
    }
  },

  warn: (obj, msg) => {
    const [message, data] = formatLog(obj, msg);
    if (data) {
      console.warn(`[WARN] ${message}`, data);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  error: (obj, msg) => {
    const [message, data] = formatLog(obj, msg);
    if (data) {
      console.error(`[ERROR] ${message}`, data);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },

  fatal: (obj, msg) => {
    const [message, data] = formatLog(obj, msg);
    if (data) {
      console.error(`[FATAL] ${message}`, data);
    } else {
      console.error(`[FATAL] ${message}`);
    }
  },
};

export default log;
