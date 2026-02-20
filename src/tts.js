import { writeFileSync, mkdirSync } from 'fs';
import { logger } from './logger.js';

const TTS_PROVIDER = process.env.TTS_PROVIDER || 'google';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GOOGLE_VOICE = process.env.GOOGLE_VOICE || 'en-US-Wavenet-D';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
const OUTPUT_PATH = './data/speech.mp3';

/**
 * Synthesizes speech via the Google Cloud Text-to-Speech REST API.
 * Uses a calm male (Wavenet-D) or female (Neural2-F) voice by default.
 * No npm SDK required — uses Node's built-in fetch.
 *
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} Path to the saved MP3 file
 */
async function synthesizeWithGoogle(text) {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not set. Add it to your .env file.');
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

  const body = {
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: GOOGLE_VOICE,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.85, // Slightly slower than normal for a calm feel
      pitch: -2.0, // Lower pitch for a soothing tone
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google TTS API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const audioBytes = Buffer.from(data.audioContent, 'base64');
  mkdirSync('./data', { recursive: true });
  writeFileSync(OUTPUT_PATH, audioBytes);
  logger.debug(`Google TTS audio saved to ${OUTPUT_PATH}`);
  return OUTPUT_PATH;
}

/**
 * Synthesizes speech via the ElevenLabs TTS REST API.
 * Uses a low-energy, stable voice configuration for a calm, peaceful tone.
 *
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} Path to the saved MP3 file
 */
async function synthesizeWithElevenLabs(text) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set. Add it to your .env file.');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

  const body = {
    text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.8, // High stability = more consistent, less dynamic
      similarity_boost: 0.6,
      style: 0.0, // No extra expressiveness
      use_speaker_boost: false,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  mkdirSync('./data', { recursive: true });
  writeFileSync(OUTPUT_PATH, audioBuffer);
  logger.debug(`ElevenLabs TTS audio saved to ${OUTPUT_PATH}`);
  return OUTPUT_PATH;
}

/**
 * Converts text to speech using the configured TTS provider (Google or ElevenLabs).
 * The output is always written to a local MP3 file for playback.
 *
 * @param {string} text - The text to speak
 * @returns {Promise<string>} Path to the generated audio file
 */
export async function synthesizeSpeech(text) {
  logger.info(`Synthesizing speech via ${TTS_PROVIDER} TTS`);

  if (TTS_PROVIDER === 'elevenlabs') {
    return synthesizeWithElevenLabs(text);
  }

  return synthesizeWithGoogle(text);
}
