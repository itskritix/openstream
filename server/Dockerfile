# syntax=docker/dockerfile:1
# Build context is the repo root (see docker-compose.yml).

# --- Build the web dashboard ---
FROM node:20-bookworm-slim AS web-build
WORKDIR /web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# --- Build the server (compiles TS, builds native modules) ---
FROM node:20-bookworm-slim AS server-build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npm run build

# --- Runtime ---
FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV WEB_DIR=/app/web
# node_modules include compiled native addons from the build stage (same base image).
COPY --from=server-build /app/node_modules ./node_modules
COPY --from=server-build /app/dist ./dist
COPY --from=server-build /app/package.json ./package.json
COPY --from=web-build /web/dist ./web
EXPOSE 3000
CMD ["node", "dist/index.js"]
