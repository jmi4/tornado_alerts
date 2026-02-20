import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Writes a formatted log line to stdout and optionally to a file.
 * LOG_FILE is read per-call so that tests can set process.env.LOG_FILE
 * after module import and still see file logging behavior.
 * @param {string} level - Log level label (INFO, WARN, ERROR, DEBUG)
 * @param {string} message - The message to log
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}`;
  console.log(line);

  const logFile = process.env.LOG_FILE;
  if (logFile) {
    try {
      mkdirSync(dirname(logFile), { recursive: true });
      appendFileSync(logFile, line + '\n');
    } catch {
      // Silently ignore file write errors to avoid cascading failures
    }
  }
}

/**
 * Application logger with console output and optional file logging.
 * Set the LOG_FILE environment variable to enable file logging.
 */
export const logger = {
  /** @param {string} msg */
  info: (msg) => log('INFO', msg),
  /** @param {string} msg */
  warn: (msg) => log('WARN', msg),
  /** @param {string} msg */
  error: (msg) => log('ERROR', msg),
  /** @param {string} msg */
  debug: (msg) => log('DEBUG', msg),
};
