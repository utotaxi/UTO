# Stage 1: Build the server bundle with esbuild
FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev for build tools)
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source files needed for the build
COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig.json ./

# esbuild bundles TypeScript → ESM JavaScript in server_dist/
RUN npm run server:build

# Stage 2: Production runtime
FROM node:22-alpine

WORKDIR /app

# Copy the built bundle + templates
COPY --from=builder /app/server_dist/ ./server_dist/
COPY --from=builder /app/server/templates/ ./server/templates/

# Install only production dependencies (express, socket.io, stripe, etc.)
COPY --from=builder /app/package*.json ./
RUN npm ci --prefer-offline --omit=dev

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server_dist/index.js"]
