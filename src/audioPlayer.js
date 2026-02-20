import { spawn } from 'child_process';
import { logger } from './logger.js';

const VOLUME = parseInt(process.env.VOLUME || '30', 10);
const AUDIO_PLAYER = process.env.AUDIO_PLAYER || 'mpg123';

/**
 * Plays an audio file using the system audio player (mpg123 or aplay).
 * The volume is controlled via the VOLUME environment variable (0–100, default 30).
 * Resolves when playback completes; rejects on player errors.
 *
 * @param {string} filePath - Absolute or relative path to the MP3/WAV file to play
 * @returns {Promise<void>} Resolves when the audio finishes playing
 */
export function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    logger.info(`Playing audio at ${VOLUME}% volume using ${AUDIO_PLAYER}`);

    let args;
    if (AUDIO_PLAYER === 'aplay') {
      // aplay is for WAV files and does not support volume flags directly
      args = [filePath];
    } else {
      // mpg123: -q suppresses output, --volume sets volume 0–100
      args = ['-q', '--volume', String(VOLUME), filePath];
    }

    const player = spawn(AUDIO_PLAYER, args, { stdio: 'inherit' });

    player.on('error', (err) => {
      logger.error(`Audio player "${AUDIO_PLAYER}" failed: ${err.message}`);
      reject(err);
    });

    player.on('close', (code) => {
      if (code !== 0) {
        logger.warn(`Audio player exited with non-zero code: ${code}`);
      }
      resolve();
    });
  });
}
