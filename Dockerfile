# ── Stage 1: Install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first to leverage layer caching
COPY package*.json ./

# Install only production dependencies (no devDependencies)
RUN npm ci --omit=dev


# ── Stage 2: Final production image ───────────────────────────────────────────
FROM node:20-alpine AS runner

# Install mpg123 for MP3 audio playback
# (add alsa-utils if you prefer aplay for WAV output)
RUN apk add --no-cache mpg123

WORKDIR /app

# Create runtime directories for logs and deduplication data
RUN mkdir -p /app/logs /app/data

# Copy production node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

ENV NODE_ENV=production

# Declare volumes so users can persist logs and spoken-alerts data
VOLUME ["/app/logs", "/app/data"]

CMD ["node", "src/index.js"]
