# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json  ./packages/shared/
COPY packages/api/package.json     ./packages/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/api    ./packages/api

RUN pnpm --filter @mercury/shared build
RUN pnpm --filter @mercury/api   build

# ---- runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json  ./packages/shared/
COPY packages/api/package.json     ./packages/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist    ./packages/api/dist

EXPOSE 3000
CMD ["node", "packages/api/dist/index.js"]
