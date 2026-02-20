import { logger } from './logger.js';

const NWS_API_BASE = 'https://api.weather.gov';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 5_000;

/**
 * Returns a Promise that resolves after the specified delay.
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches active Tornado Warning alerts from the NOAA National Weather Service API
 * for a given US state. Retries automatically on network failure using exponential
 * backoff (up to MAX_RETRIES attempts).
 *
 * @param {string} state - Two-letter US state code (e.g. "KY")
 * @param {number} [attempt=0] - Current retry attempt (used internally)
 * @param {(ms: number) => Promise<void>} [_delayFn=delay] - Delay function (injectable for tests)
 * @returns {Promise<import('./alertProcessor.js').AlertFeature[]>} Array of GeoJSON alert features
 */
export async function fetchAlerts(state, attempt = 0, _delayFn = delay) {
  const url = new URL(`${NWS_API_BASE}/alerts/active`);
  url.searchParams.set('area', state.toUpperCase());
  url.searchParams.set('event', 'Tornado Warning');
  url.searchParams.set('status', 'actual');

  try {
    logger.debug(`Fetching NWS alerts (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': '(calm-tornado-alert, github.com/jmi4/tornado_alerts)',
        Accept: 'application/geo+json',
      },
    });

    if (!response.ok) {
      throw new Error(`NWS API responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    const features = data.features ?? [];
    logger.debug(`NWS returned ${features.length} active alert(s)`);
    return features;
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      logger.error(`Giving up after ${MAX_RETRIES + 1} attempts: ${err.message}`);
      return [];
    }

    const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt);
    logger.warn(`Network error, retrying in ${backoffMs / 1000}s: ${err.message}`);
    await _delayFn(backoffMs);
    return fetchAlerts(state, attempt + 1, _delayFn);
  }
}
