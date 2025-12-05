# Multi-stage build for optimized production image

# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy prisma schema (needed for postinstall)
COPY prisma ./prisma

# Install all dependencies
RUN npm ci

# Copy source code (filtered by .dockerignore - see that file for exclusions)
# SECURITY: Ensure .dockerignore excludes .env*, secrets/, *.key, *.pem, etc.
# Only copying: src/, public/, next.config.js, tsconfig.json, tailwind.config.ts, postcss.config.js
COPY src ./src
COPY public ./public
COPY next.config.js tsconfig.json tailwind.config.ts postcss.config.js ./

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application (with dummy env vars for build)
ARG NEXT_PHASE=phase-production-build
ARG DATABASE_URL="sqlserver://dummy:dummy@dummy.database.windows.net:1433;database=dummy;encrypt=true"
ARG OPENAI_API_KEY="sk-dummy-key-for-build-only"
ARG NEXTAUTH_SECRET="dummy-secret-for-build-only"
ARG NEXTAUTH_URL="http://localhost:3000"
ARG AZURE_AD_CLIENT_ID="dummy-client-id"
ARG AZURE_AD_CLIENT_SECRET="dummy-client-secret"
ARG AZURE_AD_TENANT_ID="dummy-tenant-id"
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
# SECURITY: Using --ignore-scripts is SAFE here because:
# 1. We copy the pre-built Prisma client from the builder stage (no generation needed)
# 2. All postinstall scripts already ran in the builder stage
# 3. This prevents arbitrary script execution in the production container
# 4. The Prisma client is copied from: /app/node_modules/.prisma (see below)
RUN npm ci --only=production --ignore-scripts

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Next.js config
COPY --from=builder /app/next.config.js ./

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["npm", "start"]

