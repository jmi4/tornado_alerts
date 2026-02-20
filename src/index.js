import 'dotenv/config';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { fetchAlerts } from './poller.js';
import { filterTornadoWarnings, generateCalmMessage } from './alertProcessor.js';
import { synthesizeSpeech } from './tts.js';
import { playAudio } from './audioPlayer.js';
import { loadSpokenAlerts, hasBeenSpoken, markAsSpoken } from './deduplication.js';

/** @type {number} Timestamp of the last spoken message (used for rate limiting) */
let lastSpeechTime = 0;

/** @type {boolean} Set to true when a shutdown signal is received */
let isShuttingDown = false;

/** @type {ReturnType<typeof setTimeout> | null} Handle to the active poll timer */
let pollTimer = null;

/**
 * Converts text to speech and plays the audio, subject to a rate limit.
 * If called too soon after the last speech, the message is silently dropped.
 *
 * @param {string} message - The text to speak aloud
 * @returns {Promise<void>}
 */
export async function speak(message) {
  const rateLimit = parseInt(process.env.SPEECH_RATE_LIMIT_MS || '60000', 10);
  const now = Date.now();
  if (now - lastSpeechTime < rateLimit) {
    logger.warn('Rate limit active — skipping speech to avoid annoyance');
    return;
  }

  lastSpeechTime = now;

  try {
    const audioPath = await synthesizeSpeech(message);
    await playAudio(audioPath);
  } catch (err) {
    logger.error(`Speech failed: ${err.message}`);
  }
}

/**
 * Performs a single NWS polling cycle: fetches active alerts, filters for
 * Tornado Warnings, and speaks any new ones that have not been spoken before.
 *
 * @returns {Promise<void>}
 */
export async function pollOnce() {
  const state = process.env.ALERT_STATE || 'KY';
  const county = process.env.ALERT_COUNTY || 'Jefferson';
  logger.info(`Polling NWS API for Tornado Warnings in ${county} County, ${state}`);
  const features = await fetchAlerts(state);
  const warnings = filterTornadoWarnings(features);

  logger.info(`Found ${warnings.length} active Tornado Warning(s)`);

  for (const warning of warnings) {
    if (hasBeenSpoken(warning.id)) {
      logger.debug(`Skipping already-spoken alert: ${warning.id}`);
      continue;
    }

    logger.info(`New alert: ${warning.properties.headline}`);
    const message = generateCalmMessage(warning);
    await speak(message);
    markAsSpoken(warning.id);
  }
}

/**
 * Starts the main polling loop. Calls pollOnce immediately, then schedules
 * the next poll after POLL_INTERVAL_MS unless shutdown has been requested.
 */
export function startPolling() {
  const intervalMs = parseInt(process.env.POLL_INTERVAL_MS || '300000', 10);

  const schedulePoll = async () => {
    if (isShuttingDown) return;
    await pollOnce();
    if (!isShuttingDown) {
      pollTimer = setTimeout(schedulePoll, intervalMs);
    }
  };

  schedulePoll();
}

/**
 * Handles SIGTERM and SIGINT signals for graceful shutdown.
 * Clears the active poll timer and exits the process cleanly.
 */
export async function shutdown() {
  logger.info('Shutdown signal received — stopping gracefully');
  isShuttingDown = true;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  process.exit(0);
}

/**
 * Application entry point. Loads configuration, speaks a startup test message,
 * and begins the polling loop.
 */
export async function main() {
  const state = process.env.ALERT_STATE || 'KY';
  const county = process.env.ALERT_COUNTY || 'Jefferson';
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || '300000', 10);
  const rateLimit = parseInt(process.env.SPEECH_RATE_LIMIT_MS || '60000', 10);

  logger.info('=== Calm Tornado Alert Speaker v1.0.0 ===');
  logger.info(`Monitoring: ${county} County, ${state}`);
  logger.info(`Poll interval: ${pollInterval / 1000}s | Speech rate limit: ${rateLimit / 1000}s`);

  loadSpokenAlerts();

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Speak a calm startup message to verify audio is working
  await speak('Testing… everything is calm.');

  startPolling();
}

/**
 * Resets module-level rate limit and shutdown state. For use in tests only.
 * @internal
 */
export function _resetRateLimit() {
  lastSpeechTime = 0;
  isShuttingDown = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

// Auto-run only when this file is executed directly (e.g. `node src/index.js`)
// Not when imported by tests or other modules.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    logger.error(`Fatal startup error: ${err.message}`);
    process.exit(1);
  });
}
