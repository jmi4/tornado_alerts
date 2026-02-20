import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const LOG_FILE = process.env.LOG_FILE;

/**
 * Writes a formatted log line to stdout and optionally to a file.
 * @param {string} level - Log level label (INFO, WARN, ERROR, DEBUG)
 * @param {string} message - The message to log
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}`;
  console.log(line);

  if (LOG_FILE) {
    try {
      mkdirSync(dirname(LOG_FILE), { recursive: true });
      appendFileSync(LOG_FILE, line + '\n');
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
