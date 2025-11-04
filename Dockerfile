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

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application (with dummy env vars for build)
ENV NEXT_PHASE=phase-production-build
ENV DATABASE_URL="sqlserver://dummy:dummy@dummy.database.windows.net:1433;database=dummy;encrypt=true"
ENV OPENAI_API_KEY="sk-dummy-key-for-build-only"
ENV NEXTAUTH_SECRET="dummy-secret-for-build-only"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV AZURE_AD_CLIENT_ID="dummy-client-id"
ENV AZURE_AD_CLIENT_SECRET="dummy-client-secret"
ENV AZURE_AD_TENANT_ID="dummy-tenant-id"
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
# Skip postinstall since we copy the generated Prisma client from builder
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

