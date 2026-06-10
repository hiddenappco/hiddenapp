FROM node:22-slim

# Install system dependencies needed for native modules and secure connections
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ALL dependencies (including devDependencies for tsc)
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npx tsc

# Remove devDependencies for smaller image
RUN npm prune --production

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Start the agent worker
CMD ["node", "dist/index.js"]
