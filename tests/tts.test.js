import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

import { writeFileSync, mkdirSync } from 'fs';
import { synthesizeSpeech } from '../src/tts.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_AUDIO_B64 = Buffer.from('fake audio data').toString('base64');

function makeGoogleSuccessResponse() {
  return {
    ok: true,
    json: () => Promise.resolve({ audioContent: FAKE_AUDIO_B64 }),
  };
}

function makeElevenLabsSuccessResponse() {
  return {
    ok: true,
    arrayBuffer: () => Promise.resolve(Buffer.from('fake audio data').buffer),
  };
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  // Clean up env vars set during tests
  delete process.env.TTS_PROVIDER;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_VOICE;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_VOICE_ID;
});

// ── Google Cloud TTS ──────────────────────────────────────────────────────────

describe('synthesizeSpeech – Google provider', () => {
  beforeEach(() => {
    process.env.TTS_PROVIDER = 'google';
    process.env.GOOGLE_API_KEY = 'test-google-key';
  });

  it('calls the Google TTS REST endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('texttospeech.googleapis.com');
  });

  it('includes the API key in the request URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('test-google-key');
  });

  it('speakingRate is ≤ 0.9 (calm speaking rate — spec requirement)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.audioConfig.speakingRate).toBeLessThanOrEqual(0.9);
  });

  it('pitch is ≤ 0 (calm, low pitch — spec requirement)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.audioConfig.pitch).toBeLessThanOrEqual(0);
  });

  it('requests MP3 audio encoding', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.audioConfig.audioEncoding).toBe('MP3');
  });

  it('sends the input text in the request body', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('tornado warning test');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.input.text).toBe('tornado warning test');
  });

  it('uses en-US language code', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.voice.languageCode).toBe('en-US');
  });

  it('saves the decoded audio buffer to disk', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    expect(writeFileSync).toHaveBeenCalledOnce();
    const [, writtenBuf] = vi.mocked(writeFileSync).mock.calls[0];
    expect(Buffer.isBuffer(writtenBuf)).toBe(true);
  });

  it('creates the output directory before writing', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('returns the path to the output MP3 file', async () => {
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    const result = await synthesizeSpeech('hello');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\.mp3$/);
  });

  it('throws when GOOGLE_API_KEY is not set', async () => {
    delete process.env.GOOGLE_API_KEY;
    await expect(synthesizeSpeech('hello')).rejects.toThrow(/GOOGLE_API_KEY/);
  });

  it('throws on a non-2xx HTTP response from Google TTS', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });
    await expect(synthesizeSpeech('hello')).rejects.toThrow(/401/);
  });
});

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────

describe('synthesizeSpeech – ElevenLabs provider', () => {
  beforeEach(() => {
    process.env.TTS_PROVIDER = 'elevenlabs';
    process.env.ELEVENLABS_API_KEY = 'test-eleven-key';
    process.env.ELEVENLABS_VOICE_ID = 'test-voice-id';
  });

  it('calls the ElevenLabs TTS REST endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('hello');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('api.elevenlabs.io');
    expect(url).toContain('text-to-speech');
  });

  it('includes the voice ID in the endpoint URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('hello');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('test-voice-id');
  });

  it('sends the API key in the xi-api-key header', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('hello');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts.headers['xi-api-key']).toBe('test-eleven-key');
  });

  it('stability is ≥ 0.7 (calm, consistent voice — spec requirement)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('hello');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.voice_settings.stability).toBeGreaterThanOrEqual(0.7);
  });

  it('style is 0 (no expressiveness — calm tone)', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('hello');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.voice_settings.style).toBe(0);
  });

  it('sends the input text in the request body', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('tornado warning test');
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.text).toBe('tornado warning test');
  });

  it('saves the audio buffer to disk', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('hello');
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('returns the path to the output MP3 file', async () => {
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    const result = await synthesizeSpeech('hello');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\.mp3$/);
  });

  it('throws when ELEVENLABS_API_KEY is not set', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    await expect(synthesizeSpeech('hello')).rejects.toThrow(/ELEVENLABS_API_KEY/);
  });

  it('throws on a non-2xx HTTP response from ElevenLabs', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });
    await expect(synthesizeSpeech('hello')).rejects.toThrow(/403/);
  });
});

// ── Provider selection ────────────────────────────────────────────────────────

describe('synthesizeSpeech – provider selection', () => {
  it('defaults to Google when TTS_PROVIDER is not set', async () => {
    delete process.env.TTS_PROVIDER;
    process.env.GOOGLE_API_KEY = 'test-key';
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('texttospeech.googleapis.com');
  });

  it('uses Google when TTS_PROVIDER=google', async () => {
    process.env.TTS_PROVIDER = 'google';
    process.env.GOOGLE_API_KEY = 'test-key';
    vi.mocked(fetch).mockResolvedValue(makeGoogleSuccessResponse());
    await synthesizeSpeech('hello');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('texttospeech.googleapis.com');
  });

  it('uses ElevenLabs when TTS_PROVIDER=elevenlabs', async () => {
    process.env.TTS_PROVIDER = 'elevenlabs';
    process.env.ELEVENLABS_API_KEY = 'test-key';
    vi.mocked(fetch).mockResolvedValue(makeElevenLabsSuccessResponse());
    await synthesizeSpeech('hello');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('elevenlabs.io');
  });
});
