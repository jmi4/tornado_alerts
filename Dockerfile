# ── Stage 1: Install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first to leverage layer caching.
# If package-lock.json is committed to the repo it will be included here,
# which is recommended for fully reproducible builds.
COPY package*.json ./

# Install only production dependencies (no devDependencies).
# Using `npm install` rather than `npm ci` so the build succeeds whether or
# not a package-lock.json is present in the repo. Once a lockfile is
# committed, switch this to `npm ci --omit=dev` for stricter reproducibility.
RUN npm install --omit=dev


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
