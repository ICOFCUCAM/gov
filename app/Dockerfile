# CivicOS Next.js app — multi-stage, non-root. The runtime image carries the
# full .next build and node_modules and runs `next start` (next.config.mjs
# does not use `output: 'standalone'`).
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
# The workspace file carries the dependency overrides and the packages allowed
# to run install scripts; the install must match the lockfile exactly.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN useradd --uid 10001 --create-home civic \
 && mkdir -p /var/lib/civicos/state && chown civic /var/lib/civicos/state
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
USER 10001
EXPOSE 3000
# Liveness only (no substrate call); readiness is /api/health?ready in the Helm chart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health?live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
