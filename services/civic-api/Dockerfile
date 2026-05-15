# CivicOS API — multi-stage, distroless-friendly, non-root.
# Sovereign-portable: no cloud-vendor base images, pinned Node.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile=false --prod=false

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && useradd --uid 10001 --create-home civic
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
USER 10001
EXPOSE 4000
# Readiness/liveness wired to /api/health/* in k8s.
CMD ["node", "dist/main.js"]
