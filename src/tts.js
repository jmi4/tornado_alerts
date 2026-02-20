import { writeFileSync, mkdirSync } from 'fs';
import { logger } from './logger.js';

const OUTPUT_PATH = './data/speech.mp3';

/**
 * Synthesizes speech via the Google Cloud Text-to-Speech REST API.
 * Uses a calm voice with a reduced speaking rate and lower pitch.
 * No npm SDK required — uses Node's built-in fetch.
 *
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} Path to the saved MP3 file
 */
async function synthesizeWithGoogle(text) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set. Add it to your .env file.');
  }

  const voice = process.env.GOOGLE_VOICE || 'en-US-Wavenet-D';
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const body = {
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: voice,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.85, // Slightly slower than normal for a calm feel (≤ 0.9 per spec)
      pitch: -2.0, // Lower pitch for a soothing tone (≤ 0 per spec)
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
 * Uses a high-stability, zero-style voice configuration for a calm, peaceful tone.
 *
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} Path to the saved MP3 file
 */
async function synthesizeWithElevenLabs(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set. Add it to your .env file.');
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const body = {
    text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.8, // High stability = consistent, calm delivery (≥ 0.7 per spec)
      similarity_boost: 0.6,
      style: 0.0, // No extra expressiveness — deliberately calm
      use_speaker_boost: false,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
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
  const provider = process.env.TTS_PROVIDER || 'google';
  logger.info(`Synthesizing speech via ${provider} TTS`);

  if (provider === 'elevenlabs') {
    return synthesizeWithElevenLabs(text);
  }

  return synthesizeWithGoogle(text);
}
