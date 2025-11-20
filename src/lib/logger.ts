import type { Logger, LoggerOptions } from "pino";
import pino from "pino";

/**
 * Configured logger instance for PodScope
 *
 * Supports both stdout (default, recommended for Kubernetes) and file-based logging.
 * Configuration is controlled via environment variables:
 * - LOG_LEVEL: trace, debug, info, warn, error, fatal (default: info)
 * - LOG_DESTINATION: stdout or file path (default: stdout)
 * - LOG_FILE_PATH: Path to log file when using file destination
 *
 * For Kubernetes deployments, use stdout and collect logs via `kubectl logs`.
 * File-based logging requires write permissions on the pod volume.
 */

const LOG_LEVEL = (process.env.LOG_LEVEL || "info") as pino.Level;
const LOG_DESTINATION = process.env.LOG_DESTINATION || "stdout";
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || "/app/logs/podscope.log";

const isDevelopment = process.env.NODE_ENV !== "production";

// Base logger configuration
const baseConfig: LoggerOptions = {
  level: LOG_LEVEL,
  // Use pretty printing in development for better readability
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
};

// Create logger with appropriate destination
let logger: Logger;

if (LOG_DESTINATION === "stdout" || !LOG_DESTINATION) {
  // Default: stdout logging (recommended for Kubernetes)
  logger = pino(baseConfig);
} else {
  // File-based logging
  // Note: This requires write permissions in Kubernetes environments
  try {
    logger = pino(baseConfig, pino.destination(LOG_FILE_PATH));
    logger.info({ logFile: LOG_FILE_PATH }, "File-based logging initialized");
  } catch (error) {
    // Fallback to stdout if file logging fails
    logger = pino(baseConfig);
    logger.error(
      { error, attemptedPath: LOG_FILE_PATH },
      "Failed to initialize file logging, falling back to stdout"
    );
  }
}

// Add helper methods for common logging patterns
export const log = {
  /**
   * Log a trace message (most verbose)
   */
  trace: (obj: object | string, msg?: string) => {
    if (typeof obj === "string") {
      logger.trace(obj);
    } else {
      logger.trace(obj, msg);
    }
  },

  /**
   * Log a debug message
   */
  debug: (obj: object | string, msg?: string) => {
    if (typeof obj === "string") {
      logger.debug(obj);
    } else {
      logger.debug(obj, msg);
    }
  },

  /**
   * Log an info message
   */
  info: (obj: object | string, msg?: string) => {
    if (typeof obj === "string") {
      logger.info(obj);
    } else {
      logger.info(obj, msg);
    }
  },

  /**
   * Log a warning message
   */
  warn: (obj: object | string, msg?: string) => {
    if (typeof obj === "string") {
      logger.warn(obj);
    } else {
      logger.warn(obj, msg);
    }
  },

  /**
   * Log an error message
   */
  error: (obj: object | string, msg?: string) => {
    if (typeof obj === "string") {
      logger.error(obj);
    } else {
      logger.error(obj, msg);
    }
  },

  /**
   * Log a fatal message (most severe)
   */
  fatal: (obj: object | string, msg?: string) => {
    if (typeof obj === "string") {
      logger.fatal(obj);
    } else {
      logger.fatal(obj, msg);
    }
  },

  /**
   * Access the underlying pino logger instance
   */
  logger,
};

export default log;
