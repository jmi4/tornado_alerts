# Project Spec: Calm Tornado Alert Speaker App
**Version:** 1.4
**Date:** February 2026
**Previous Version:** 1.3
**Goal:**
Build a lightweight, containerized service that monitors US tornado warnings and reads them aloud in a calm, soothing voice. No loud alarms or jarring sounds—just a peaceful, gentle announcement. Designed to eventually run on a Raspberry Pi (or any Linux device) with a speaker, but focus on software first. Runs in Docker for portability.

## Tech Stack
- Language: Node.js 20+ (ESM syntax)
- Container: Docker + Dockerfile (prefer multi-stage build for small size)
- Weather data source: NOAA National Weather Service API (public, free, no key required for basic usage)
- Text-to-Speech: Google Cloud Text-to-Speech (preferred for free tier and natural calm voices) **OR** ElevenLabs (if user prefers ultra-calm / custom voices)
  - ElevenLabs minimum required API key permissions:
    - **Text to Speech**: set to **access** (the only non-disabled option)
    - **Voices**: set to **read** (minimum; do not use write unless managing voices)
    - All other permission scopes (Music, Dubbing, Voice Design, Studio, etc.) must be set to **no access**
    - A monthly character limit is recommended to cap costs
- Audio playback: Use `mpg123` or `aplay` installed in the container or assumed on host
- Configuration: `.env` file for API keys, selected voice, volume level, location, etc.
- Logging: Console + simple file logging (optional rotation)
- **Testing framework: Jest or Vitest** (required; `node:test` is not sufficient for coverage reporting and mocking needs)

## Core Features
1. **Polling**
   - Poll NOAA NWS API every 5 minutes for active alerts.
   - Filter by user-configured county + state (e.g., "KY, Jefferson" for Louisville area).
   - Focus only on "Tornado Warning" events (ignore Watches, Severe Thunderstorm Warnings, etc.).

2. **Alert Processing**
   - On new Tornado Warning (detected by unique alert ID):
     - Parse key details: affected area, start/end time, severity, description.
     - Generate calm, friendly spoken message, e.g.:
       "Hey… just a gentle heads-up — there's a tornado warning for [area] right now. Please take it easy and head to a safe spot when you can."
     - Keep tone reassuring, low-energy, slow cadence.

3. **Speech Output**
   - Speak the message at low volume (configurable, default ~30%).
   - No startup sound, siren, or chime (unless added in future version).
   - Rate-limit: maximum 1 speech per minute to prevent annoyance.

4. **Deduplication**
   - Track spoken alert IDs in memory (or simple file) to avoid repeating the same warning.

5. **Graceful Behavior**
   - On startup: speak one test message ("Testing… everything is calm.")
   - On shutdown: finish any in-progress speech, stop polling.
   - Retry on network failure (exponential backoff, max 5 attempts).

## Testing & Validation Requirements (NON-NEGOTIABLE)

This project **MUST** follow strict Test-First / Test-Driven Development enforced at every step. No implementation code may be written or modified until tests exist and fail appropriately.

### 1. Generate Comprehensive Test Suite First

Before writing **any** production code, create a full suite of tests based solely on this spec (features, constraints, edge cases, acceptance criteria).

Tests must cover:

- **Unit tests** for every core function/module:
  - Polling logic (URL construction, response parsing, retry/backoff)
  - Alert parsing and filtering (Tornado Warning vs. other event types)
  - Message generation (calm tone, correct area/time interpolation)
  - Deduplication (in-memory Set, JSON file round-trip, ID tracking)
  - Rate limiting (speech gating, timestamp comparison)
  - TTS provider selection and request construction (mocked HTTP calls)
  - Audio player invocation (mocked child process spawn)
- **Integration tests** (using mocked external dependencies):
  - Mock NOAA API response → parsed alert → generated message → spoken output
  - Full polling cycle: network call → filter → dedup check → rate limit → speak
  - Startup flow: test message spoken, polling loop begins
- **Edge cases** (all must be covered):
  - No active alerts returned by NWS API
  - Network failure on first attempt, success on retry (2nd–5th attempt)
  - Network failure on all 5 attempts (max retries exhausted)
  - Duplicate alert ID received on second poll (must not be re-spoken)
  - `ALERT_STATE` or `ALERT_COUNTY` missing from `.env`
  - Invalid or missing TTS API key (should log error, not crash)
  - Rate limit active when new alert arrives (alert deferred or skipped)
  - Graceful shutdown received mid-speech
  - `spoken-alerts.json` missing on startup (should initialize cleanly)
  - `spoken-alerts.json` corrupted/invalid JSON (should recover gracefully)
- **Happy path + at least 3–5 failure scenarios per major feature area**
- Use **Jest** or **Vitest** as the test framework. Place all tests in `/tests/` folder.
- Tests must be **executable** and initially **fail** (red phase) because no implementation exists yet.

### 2. Implementation Order (Red → Green → Refactor)

1. Write and commit all tests (failing, red phase).
2. Implement minimal code to make tests pass — one feature/module at a time.
3. Refactor for cleanliness and readability while keeping 100% of tests green.
4. **Never** write implementation code first and add tests later — this is forbidden.
5. Break work into small, isolated tasks (e.g., "implement polling" → tests first → code → green → next module).

### 3. Quality Gates

The following gates must pass before any commit is pushed:

- **100% test pass rate** — no failing tests may be committed or pushed.
- **≥85% coverage on core logic** — report via `jest --coverage` or `vitest --coverage`. Coverage report must be generated and reviewed before push.
- **Startup smoke test** — an integration test that verifies the startup test message is produced (mocked TTS/audio OK).
- **Calm voice assertions** — tests must assert that TTS requests use low-pitch/calm voice parameters (e.g., `speakingRate ≤ 0.9`, `pitch ≤ 0` for Google TTS; calm voice ID for ElevenLabs).
- **If tests fail after any change**, revert or fix the code before proceeding. Never disable or skip tests to make the gate pass.

## Documentation Requirements
- **README.md**
  - Must be created at the root of the repository.
  - Include:
    - Project title and one-sentence description
    - Features overview
    - Prerequisites (Node.js version, Docker, API keys)
    - Step-by-step setup instructions (get keys, fill .env, build/run Docker)
    - Example `.env` contents (with placeholders)
    - How to run unit tests (`npm test`) and generate a coverage report (`npm run test:coverage`)
    - Example coverage report output
    - How to test (manual trigger, real alert simulation)
    - How to run on Raspberry Pi (any special notes)
    - Troubleshooting section (common issues like audio not playing)
    - Future ideas / roadmap placeholder

- **CHANGELOG.md**
  - Must be created at the root of the repository.
  - Use Keep a Changelog format[](https://keepachangelog.com/en/1.0.0/).
  - Start with:

# Changelog
All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.
[1.0.0] - 2025-02-XX
Added

Initial implementation: NOAA polling, calm TTS alerts, Docker support
Test message on startup
Basic deduplication and retry logic

Changed

n/a

Fixed

n/a
- The AI should generate this initial entry based on v1.0 features.
- In future versions, the changelog must be updated with new Added/Changed/Fixed/Removed sections.

## Pre-Push Verification (required before every push to GitHub)

The following checks must pass locally before any commit is pushed to the remote repository:

1. **All tests pass with ≥85% coverage**

   ```bash
   npm run test:coverage
   ```

   Output must show 100% tests passing and ≥85% statement/branch coverage on core modules. A failed or uncovered build must never be pushed.

2. **Docker build succeeds**

   ```bash
   docker build -t calm-tornado-alert .
   ```

   The build must complete with no errors. A failed build must never be pushed.

3. **Container starts cleanly**

   ```bash
   docker run --rm --env-file .env calm-tornado-alert
   ```

   The startup log must include the test message line and no fatal errors before the first poll.

4. **`package-lock.json` is committed** — Run `npm install` once locally (requires Node.js 20+) to generate `package-lock.json`, then commit it alongside any dependency changes. This file must be present in the repository so the Docker build can switch to `npm ci` for reproducible installs.

## Acceptance Criteria

- Docker image builds successfully
- Runs with: `docker run -d --env-file .env calm-tornado-alert`
- Speaks test message on first start
- Remains silent when no active tornado warnings
- Speaks new warnings in calm voice when they appear
- No audio distortion or overly loud output
- No crashes on temporary network issues
- **Full test suite generated first; all tests pass on final build**
- **Code includes Jest/Vitest setup in `package.json` scripts (`test`, `test:coverage`)**
- **README includes `npm test` instructions and a coverage report example**
- ≥85% test coverage on all core logic modules (verified via coverage report)
- Code follows ESLint + Prettier rules
- Every function has JSDoc comments
- `README.md` is complete, clear, and beginner-friendly
- `CHANGELOG.md` exists and follows the Keep a Changelog format with initial v1.0 entry

## Constraints & Guardrails
- Target Docker image size: < 150 MB (ideally < 100 MB)
- No GUI — CLI logs only
- Never hard-code API keys or secrets — use `.env` only
- Voice selection:
- Google: prefer `en-US-Wavenet-D` (male) or `en-US-Neural2-F` (female) — low pitch, calm
- ElevenLabs: choose a low-energy, peaceful voice if used
- No external dependencies beyond what's needed for speech & playback

## Deliverables
- Complete Git-ready repository structure
- `Dockerfile` (multi-stage preferred)
- `docker-compose.yml` (optional but helpful for local/Pi testing)
- `README.md` (fully written as described above)
- `CHANGELOG.md` (initialized with v1.0 entry)
- `.env.example` file
- **Comprehensive test suite in `/tests/` folder (written before implementation code)**
- **Jest/Vitest configuration (`jest.config.js` or `vitest.config.js`)**
- Source code with JSDoc comments

## Suggested Timeline (for AI implementation)
- ~30–45 min: Write full test suite (all failing — red phase)
- ~1 hour: NOAA polling + alert parsing (green phase for polling tests)
- ~1.5–2 hours: TTS integration + audio playback (green phase for TTS/audio tests)
- ~30–45 min: polish, deduplication, rate limiting (green phase for remaining tests)
- ~20–30 min: refactor pass (all tests remain green)
- ~20–30 min: README.md + CHANGELOG.md creation

Ready for implementation.
