import { spawn } from 'child_process';
import { logger } from './logger.js';

/**
 * Plays an audio file using the system audio player (mpg123 or aplay).
 * The volume is controlled via the VOLUME environment variable (0–100, default 30).
 * Resolves when playback completes; rejects on player spawn errors.
 *
 * @param {string} filePath - Absolute or relative path to the MP3/WAV file to play
 * @returns {Promise<void>} Resolves when the audio finishes playing
 */
export function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    const player = process.env.AUDIO_PLAYER || 'mpg123';
    const volume = process.env.VOLUME || '30';

    logger.info(`Playing audio at ${volume}% volume using ${player}`);

    let args;
    if (player === 'aplay') {
      // aplay is for WAV files and does not support volume flags directly
      args = [filePath];
    } else {
      // mpg123: -q suppresses output, --volume sets volume 0–100
      args = ['-q', '--volume', String(volume), filePath];
    }

    const proc = spawn(player, args, { stdio: 'inherit' });

    proc.on('error', (err) => {
      logger.error(`Audio player "${player}" failed: ${err.message}`);
      reject(err);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        logger.warn(`Audio player exited with non-zero code: ${code}`);
      }
      resolve();
    });
  });
}
