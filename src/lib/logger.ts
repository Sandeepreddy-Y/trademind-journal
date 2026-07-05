/**
 * Structured error logging utility for the TradeMind backend.
 * In production, this could be extended to write to external services
 * like Sentry, Datadog, or a log file.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.context ? `[${entry.context}]` : '',
    entry.message,
  ].filter(Boolean);

  return parts.join(' ');
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

export const logger = {
  info(message: string, context?: string, data?: unknown) {
    const entry = createLogEntry('info', message, context, data);
    console.log(formatLog(entry), data ? JSON.stringify(data) : '');
  },

  warn(message: string, context?: string, data?: unknown) {
    const entry = createLogEntry('warn', message, context, data);
    console.warn(formatLog(entry), data ? JSON.stringify(data) : '');
  },

  error(message: string, error?: Error | unknown, context?: string, data?: unknown) {
    const err = error instanceof Error ? error : undefined;
    const entry = createLogEntry('error', message, context, data, err);
    console.error(formatLog(entry));
    if (entry.error) {
      console.error(`  Error: ${entry.error.name}: ${entry.error.message}`);
      if (entry.error.stack && process.env.NODE_ENV === 'development') {
        console.error(`  Stack: ${entry.error.stack}`);
      }
    }
    if (data) {
      console.error('  Data:', JSON.stringify(data));
    }
  },

  debug(message: string, context?: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const entry = createLogEntry('debug', message, context, data);
      console.debug(formatLog(entry), data ? JSON.stringify(data) : '');
    }
  },
};

export default logger;
