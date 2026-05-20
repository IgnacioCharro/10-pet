FROM node:20-alpine AS base
RUN npm install -g pnpm@10.33.0

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @10-pet/api --filter @10-pet/shared

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN pnpm --filter @10-pet/shared build 2>/dev/null || true
RUN pnpm --filter @10-pet/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@10.33.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @10-pet/api --filter @10-pet/shared --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared ./packages/shared

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
