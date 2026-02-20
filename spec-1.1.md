# Project Spec: Calm Tornado Alert Speaker App
**Version:** 1.1
**Date:** February 2026
**Previous Version:** 1.0
**Goal:**  
Build a lightweight, containerized service that monitors US tornado warnings and reads them aloud in a calm, soothing voice. No loud alarms or jarring sounds—just a peaceful, gentle announcement. Designed to eventually run on a Raspberry Pi (or any Linux device) with a speaker, but focus on software first. Runs in Docker for portability.

## Tech Stack
- Language: Node.js 20+ (ESM syntax)
- Container: Docker + Dockerfile (prefer multi-stage build for small size)
- Weather data source: NOAA National Weather Service API (public, free, no key required for basic usage)
- Text-to-Speech: Google Cloud Text-to-Speech (preferred for free tier and natural calm voices) **OR** ElevenLabs (if user prefers ultra-calm / custom voices)
  - ElevenLabs minimum required API key permissions: **speech** (Text to Speech) and **voices** (Voices). All other permission scopes (Music, Dubbing, Voice Design, Studio, etc.) should be left disabled. A monthly character limit is recommended to cap costs.
- Audio playback: Use `mpg123` or `aplay` installed in the container or assumed on host
- Configuration: `.env` file for API keys, selected voice, volume level, location, etc.
- Logging: Console + simple file logging (optional rotation)

## Core Features
1. **Polling**  
   - Poll NOAA NWS API every 5 minutes for active alerts.  
   - Filter by user-configured county + state (e.g., "KY, Jefferson" for Louisville area).  
   - Focus only on "Tornado Warning" events (ignore Watches, Severe Thunderstorm Warnings, etc.).

2. **Alert Processing**  
   - On new Tornado Warning (detected by unique alert ID):  
     - Parse key details: affected area, start/end time, severity, description.  
     - Generate calm, friendly spoken message, e.g.:  
       "Hey… just a gentle heads-up — there’s a tornado warning for [area] right now. Please take it easy and head to a safe spot when you can."  
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

## Documentation Requirements
- **README.md**  
  - Must be created at the root of the repository.  
  - Include:  
    - Project title and one-sentence description  
    - Features overview  
    - Prerequisites (Node.js version, Docker, API keys)  
    - Step-by-step setup instructions (get keys, fill .env, build/run Docker)  
    - Example `.env` contents (with placeholders)  
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

## Acceptance Criteria
- Docker image builds successfully  
- Runs with: `docker run -d --env-file .env calm-tornado-alert`  
- Speaks test message on first start  
- Remains silent when no active tornado warnings  
- Speaks new warnings in calm voice when they appear  
- No audio distortion or overly loud output  
- No crashes on temporary network issues  
- At least 3 unit tests (e.g., polling logic, message generation, deduplication)  
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
- Basic unit tests in `/tests` folder  
- Source code with JSDoc comments

## Suggested Timeline (for AI implementation)
- ~1 hour: NOAA polling + alert parsing  
- ~1.5–2 hours: TTS integration + audio playback  
- ~30–45 min: polish, deduplication, tests, Dockerfile  
- ~20–30 min: README.md + CHANGELOG.md creation

Ready for implementation.