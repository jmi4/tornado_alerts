# Calm Tornado Alert Speaker

A lightweight, containerized service that monitors US tornado warnings and reads them aloud in a calm, soothing voice — no sirens, no alarms, just a gentle heads-up.

---

## Features

- **Real-time NOAA monitoring** — polls the National Weather Service API every 5 minutes for active Tornado Warnings (no API key required for NWS)
- **Calm, reassuring voice** — uses Google Cloud TTS or ElevenLabs to produce slow, low-pitched announcements instead of jarring alerts
- **Smart deduplication** — tracks spoken alert IDs so the same warning is never repeated
- **Rate limiting** — speaks at most once per minute to prevent annoyance
- **Graceful startup** — speaks a test message on boot to confirm audio is working
- **Resilient networking** — retries on failure with exponential backoff (up to 5 attempts)
- **Docker-ready** — multi-stage Dockerfile keeps the image lean; runs anywhere Docker does
- **Raspberry Pi compatible** — designed to run on a Pi with a speaker attached

---

## Prerequisites

| Requirement | Version / Notes |
|---|---|
| Node.js | 20 or later (only needed for local dev/testing) |
| Docker | Any recent version |
| Google Cloud account | For TTS API key (free tier: 1M chars/month) |
| *or* ElevenLabs account | Alternative TTS provider |
| `mpg123` | Installed inside the Docker image automatically |

---

## Setup

### 1. Clone the repository

```bash
git clone git@github.com:jmi4/tornado_alerts.git
cd tornado_alerts
```

### 2. Get a Text-to-Speech API key

#### Option A — Google Cloud TTS (recommended, free tier)

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project.
3. Enable the **Cloud Text-to-Speech API**.
4. Go to **APIs & Services → Credentials** and create an **API key**.
5. Copy the key — you'll use it in your `.env`.

#### Option B — ElevenLabs

1. Sign up at [elevenlabs.io](https://elevenlabs.io).
2. Go to **Profile → API Key** and copy your key.
3. Browse the voice library to find a calm, low-energy voice and copy its **Voice ID**.

### 3. Configure your environment

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```dotenv
TTS_PROVIDER=google
GOOGLE_API_KEY=AIza...your_key_here...
GOOGLE_VOICE=en-US-Wavenet-D

ALERT_STATE=KY
ALERT_COUNTY=Jefferson

VOLUME=30
POLL_INTERVAL_MS=300000
LOG_FILE=./logs/app.log
```

### 4. Build the Docker image

```bash
docker build -t calm-tornado-alert .
```

### 5. Run the container

```bash
docker run -d \
  --name calm-tornado-alert \
  --env-file .env \
  --device /dev/snd \
  --group-add audio \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/data:/app/data \
  calm-tornado-alert
```

> **macOS note:** Docker Desktop on macOS cannot access the host audio device directly. For local testing, run without Docker (`npm start`) or use a Linux host.

Or with Docker Compose (edit `docker-compose.yml` to uncomment the device section on Linux):

```bash
docker compose up -d
```

---

## Example `.env` Contents

```dotenv
# TTS provider: "google" or "elevenlabs"
TTS_PROVIDER=google
GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOOGLE_VOICE=en-US-Wavenet-D

# Location
ALERT_STATE=KY
ALERT_COUNTY=Jefferson

# Polling (ms)
POLL_INTERVAL_MS=300000
SPEECH_RATE_LIMIT_MS=60000

# Audio
VOLUME=30
AUDIO_PLAYER=mpg123

# Logging
LOG_FILE=./logs/app.log
DEDUP_FILE=./data/spoken-alerts.json
```

See `.env.example` for all available options with descriptions.

---

## Testing

### Run unit tests

```bash
npm install
npm test
```

The test suite uses Node's built-in `node:test` module (no extra packages needed) and covers:

- Alert message generation and calm tone
- Tornado Warning filtering from mixed NWS event types
- Deduplication logic and JSON round-trip persistence
- NWS URL construction and exponential backoff calculation

### Simulate an alert manually

To test the full speech pipeline without a real tornado warning:

```bash
# Run locally (not in Docker)
node -e "
import('./src/tts.js').then(({ synthesizeSpeech }) =>
import('./src/audioPlayer.js').then(({ playAudio }) =>
  synthesizeSpeech('Hey… just a gentle heads-up — there is a tornado warning for your area right now. Please head to a safe spot.')
  .then(playAudio)
));
"
```

Or set `POLL_INTERVAL_MS=5000` in your `.env` to poll very frequently during development.

---

## Running on a Raspberry Pi

1. Install Docker on your Pi:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. Clone, configure `.env`, and build as described above. The `node:20-alpine` base image supports ARM (arm64 / armv7).

3. Enable audio passthrough in `docker-compose.yml` by uncommenting:
   ```yaml
   devices:
     - /dev/snd:/dev/snd
   group_add:
     - audio
   ```

4. Make sure your Pi's audio output is set correctly:
   ```bash
   # List available output devices
   aplay -l
   # Force HDMI or 3.5mm jack
   sudo raspi-config  # Advanced Options → Audio
   ```

5. Start the service:
   ```bash
   docker compose up -d
   ```

6. Check the logs:
   ```bash
   docker compose logs -f
   ```

---

## Linting & Formatting

```bash
npm install
npm run lint      # ESLint check
npm run format    # Prettier auto-format
```

---

## Troubleshooting

**Audio is not playing**
- On Linux: make sure `/dev/snd` is passed to the container (see `docker-compose.yml`).
- On macOS: run without Docker (`npm start`) — Docker Desktop can't access Mac audio.
- Check that `mpg123` works in the container: `docker exec -it calm-tornado-alert mpg123 --version`
- Try setting `VOLUME=80` temporarily to rule out a volume issue.

**TTS API errors**
- Double-check your API key is correct and has no extra whitespace in `.env`.
- Ensure the Cloud Text-to-Speech API is enabled in your Google Cloud project.
- Check for quota limits in the Google Cloud Console.

**No alerts being spoken (even during a warning)**
- Confirm `ALERT_STATE` is a valid two-letter US state code.
- Verify the NWS API is returning data: `curl "https://api.weather.gov/alerts/active?area=KY&event=Tornado%20Warning&status=actual"`
- Check `./data/spoken-alerts.json` — delete it to reset deduplication if needed.

**Container exits immediately**
- Run `docker logs calm-tornado-alert` to see the error.
- Make sure `.env` exists and `GOOGLE_API_KEY` (or `ELEVENLABS_API_KEY`) is set.

---

## Future Ideas / Roadmap

- [ ] Support multiple county/state combinations simultaneously
- [ ] Add optional chime or soft tone before the spoken announcement
- [ ] Web dashboard for viewing active alerts and spoken history
- [ ] Push notifications (SMS / Pushover) as a secondary alert channel
- [ ] Support for additional NWS event types (e.g., Flash Flood Warnings)
- [ ] Auto-discovery of location via IP geolocation
- [ ] Wake word ("Hey, weather?") to query current conditions on demand
- [ ] Homebridge / Home Assistant integration

---

## License

MIT
