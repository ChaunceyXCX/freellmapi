# Stage 1: Build
FROM node:20-slim AS builder

# Install build dependencies for native modules (like better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root configurations and package manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build all packages (shared, server, client)
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install production dependencies only (temporary installation of build tools for compilation)
RUN apt-get update && apt-get install -y python3 make g++ && \
    npm ci --omit=dev && \
    apt-get purge -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copy built distributions from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose server port
EXPOSE 3001

# Volume for persistent SQLite database storage
VOLUME ["/app/server/data"]

CMD ["node", "server/dist/index.js"]
