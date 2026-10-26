# CivicOS Next.js app — multi-stage, non-root. The runtime image carries the
# .next build and the production dependencies only, and runs `next start`
# (next.config.mjs does not use `output: 'standalone'`). Build tools (Vite,
# Vitest, esbuild's binary) and the base image's npm stay out of it, so the
# image scan in CI sees only what runs.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
# The workspace file carries the dependency overrides and the packages allowed
# to run install scripts; the install must match the lockfile exactly.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build needs more than the default heap since plan steps I5 to I13; build stage only.
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Debian's security fixes released since the base image was built.
RUN apt-get update && apt-get -y upgrade && rm -rf /var/lib/apt/lists/*
RUN useradd --uid 10001 --create-home civic \
 && mkdir -p /var/lib/civicos/state && chown civic /var/lib/civicos/state \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
USER 10001
EXPOSE 3000
# Liveness only (no substrate call); readiness is /api/health?ready in the Helm chart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health?live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
