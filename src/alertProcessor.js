/**
 * @typedef {Object} AlertProperties
 * @property {string} event - Event type (e.g. "Tornado Warning")
 * @property {string} areaDesc - Human-readable description of the affected area
 * @property {string} effective - ISO 8601 start time of the warning
 * @property {string} expires - ISO 8601 expiry time of the warning
 * @property {string} severity - Severity level (e.g. "Extreme")
 * @property {string} description - Full warning description text
 * @property {string} headline - Short single-line headline
 */

/**
 * @typedef {Object} AlertFeature
 * @property {string} id - Unique NWS alert identifier (URN)
 * @property {AlertProperties} properties - Alert metadata and details
 */

/**
 * Formats an ISO date/time string into a friendly spoken time.
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Human-friendly time string, or fallback if invalid
 */
function formatTime(isoString) {
  try {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return 'an unknown time';
  }
}

/**
 * Generates a calm, friendly spoken message for a given tornado warning alert.
 * The tone is deliberately low-energy and reassuring — no urgency or alarm.
 * @param {AlertFeature} alert - The NWS GeoJSON alert feature
 * @returns {string} The full message text to be spoken aloud
 */
export function generateCalmMessage(alert) {
  const { areaDesc, expires } = alert.properties;
  const area = areaDesc || 'your area';
  const expiresTime = expires ? `until ${formatTime(expires)}` : 'until further notice';

  return (
    `Hey… just a gentle heads-up — there's a tornado warning for ${area} right now. ` +
    `The warning is in effect ${expiresTime}. ` +
    `Please take it easy and head to a safe spot when you can. ` +
    `Stay low, stay calm, and take care of yourself.`
  );
}

/**
 * Filters a list of NWS alert features to only include active Tornado Warnings.
 * Ignores Tornado Watches, Severe Thunderstorm Warnings, and all other event types.
 * @param {AlertFeature[]} features - Raw array of GeoJSON features from the NWS API
 * @returns {AlertFeature[]} Only the features with event === "Tornado Warning"
 */
export function filterTornadoWarnings(features) {
  return features.filter((f) => f.properties?.event === 'Tornado Warning');
}
