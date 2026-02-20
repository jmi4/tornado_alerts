import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { logger } from './logger.js';

/**
 * In-memory set of alert IDs that have already been spoken.
 * @type {Set<string>}
 */
let spokenAlertIds = new Set();

/**
 * Persists the current set of spoken alert IDs to disk.
 * Failures are logged but do not throw, keeping the app alive.
 */
function saveSpokenAlerts() {
  const dedupFile = process.env.DEDUP_FILE || './data/spoken-alerts.json';
  try {
    mkdirSync(dirname(dedupFile), { recursive: true });
    writeFileSync(dedupFile, JSON.stringify([...spokenAlertIds]));
  } catch (err) {
    logger.warn(`Could not save deduplication data: ${err.message}`);
  }
}

/**
 * Loads previously spoken alert IDs from disk into memory.
 * Safe to call on startup; silently starts fresh if no file exists or if the
 * file contains invalid JSON.
 */
export function loadSpokenAlerts() {
  const dedupFile = process.env.DEDUP_FILE || './data/spoken-alerts.json';
  try {
    const data = readFileSync(dedupFile, 'utf8');
    const ids = JSON.parse(data);
    spokenAlertIds = new Set(Array.isArray(ids) ? ids : []);
    logger.info(`Loaded ${spokenAlertIds.size} previously spoken alert ID(s) from disk`);
  } catch {
    logger.info('No existing deduplication data found — starting fresh');
  }
}

/**
 * Checks whether the given alert ID has already been spoken.
 * @param {string} alertId - The NWS alert ID to check
 * @returns {boolean} True if the alert was already spoken
 */
export function hasBeenSpoken(alertId) {
  return spokenAlertIds.has(alertId);
}

/**
 * Marks an alert as spoken in both memory and on disk.
 * @param {string} alertId - The NWS alert ID to record
 */
export function markAsSpoken(alertId) {
  spokenAlertIds.add(alertId);
  saveSpokenAlerts();
}

/**
 * Resets in-memory state. For use in tests only.
 * @internal
 */
export function _reset() {
  spokenAlertIds = new Set();
}
