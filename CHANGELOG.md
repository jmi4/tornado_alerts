# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-02-20

### Added

- Initial implementation of the Calm Tornado Alert Speaker service
- NOAA National Weather Service API polling every 5 minutes for active Tornado Warnings
- Filtering by US state (configurable via `ALERT_STATE` in `.env`)
- Calm, reassuring spoken messages generated for each new Tornado Warning
- Google Cloud Text-to-Speech integration via REST API (no npm SDK required)
- ElevenLabs Text-to-Speech as an alternative provider
- Audio playback via `mpg123` (default) or `aplay`, with configurable volume
- In-memory and file-based deduplication to prevent repeated announcements
- Rate limiting: maximum one spoken alert per minute
- Startup test message: "Testing… everything is calm."
- Graceful shutdown on SIGTERM / SIGINT signals
- Exponential backoff retry logic on network failure (up to 5 attempts)
- Console logging with optional file logging via `LOG_FILE` environment variable
- Multi-stage Dockerfile targeting `node:20-alpine` for a small image footprint
- `docker-compose.yml` for easy local and Raspberry Pi deployment
- `.env.example` with documented configuration options
- Unit tests using Node's built-in `node:test` module (no extra test framework)
- ESLint + Prettier configuration for consistent code style
- JSDoc comments on all exported functions
- Comprehensive `README.md` with setup, Pi instructions, and troubleshooting

### Changed

- n/a (initial release)

### Fixed

- n/a (initial release)
