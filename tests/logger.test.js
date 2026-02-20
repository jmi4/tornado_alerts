import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('fs', () => ({
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { appendFileSync, mkdirSync } from 'fs';
import { logger } from '../src/logger.js';

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_FILE;
});

// ── Console output ────────────────────────────────────────────────────────────

describe('logger – console output', () => {
  it('logger.info writes to console.log', () => {
    logger.info('test info message');
    expect(console.log).toHaveBeenCalledOnce();
  });

  it('logger.warn writes to console.log', () => {
    logger.warn('test warn message');
    expect(console.log).toHaveBeenCalledOnce();
  });

  it('logger.error writes to console.log', () => {
    logger.error('test error message');
    expect(console.log).toHaveBeenCalledOnce();
  });

  it('logger.debug writes to console.log', () => {
    logger.debug('test debug message');
    expect(console.log).toHaveBeenCalledOnce();
  });

  it('log line includes the message text', () => {
    logger.info('hello world');
    const [line] = vi.mocked(console.log).mock.calls[0];
    expect(line).toContain('hello world');
  });

  it('log line includes the INFO level label', () => {
    logger.info('msg');
    const [line] = vi.mocked(console.log).mock.calls[0];
    expect(line).toContain('INFO');
  });

  it('log line includes the WARN level label', () => {
    logger.warn('msg');
    const [line] = vi.mocked(console.log).mock.calls[0];
    expect(line).toContain('WARN');
  });

  it('log line includes the ERROR level label', () => {
    logger.error('msg');
    const [line] = vi.mocked(console.log).mock.calls[0];
    expect(line).toContain('ERROR');
  });

  it('log line includes the DEBUG level label', () => {
    logger.debug('msg');
    const [line] = vi.mocked(console.log).mock.calls[0];
    expect(line).toContain('DEBUG');
  });

  it('log line includes an ISO timestamp', () => {
    logger.info('msg');
    const [line] = vi.mocked(console.log).mock.calls[0];
    // ISO 8601 pattern: 2026-02-20T...
    expect(line).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ── File logging ──────────────────────────────────────────────────────────────

describe('logger – file logging', () => {
  beforeEach(() => {
    process.env.LOG_FILE = './logs/app.log';
  });

  it('writes to a log file when LOG_FILE is set', () => {
    logger.info('file log test');
    expect(appendFileSync).toHaveBeenCalledOnce();
  });

  it('creates the log directory before writing', () => {
    logger.info('msg');
    expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('appends the same formatted line to the file', () => {
    logger.info('hello file');
    const [, content] = vi.mocked(appendFileSync).mock.calls[0];
    expect(content).toContain('hello file');
    expect(content).toContain('INFO');
  });

  it('does not write to file when LOG_FILE is not set', () => {
    delete process.env.LOG_FILE;
    logger.info('no file');
    expect(appendFileSync).not.toHaveBeenCalled();
  });

  it('does not crash when the file write fails', () => {
    vi.mocked(appendFileSync).mockImplementation(() => {
      throw new Error('disk full');
    });
    expect(() => logger.info('write will fail')).not.toThrow();
  });
});
