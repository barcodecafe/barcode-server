# ── Stage 1: Build TypeScript ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions and TypeScript config
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies required for tsc)
RUN npm ci

# Copy application source code
COPY src ./src

# Build TypeScript to ./dist
RUN npm run build

# ── Stage 2: Production Runner ────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output and PM2 configuration
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./

# Expose server port
EXPOSE 5001

# Run with PM2 in cluster mode
CMD ["npm", "run", "start:cluster"]
