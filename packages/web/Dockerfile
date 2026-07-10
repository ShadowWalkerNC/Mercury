# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# copy workspace manifests
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json       ./packages/shared/
COPY packages/web/package.json          ./packages/web/

# install deps (frozen)
RUN pnpm install --frozen-lockfile

# copy source
COPY packages/shared ./packages/shared
COPY packages/web    ./packages/web

# build shared types first, then web
RUN pnpm --filter @mercury/shared build
RUN pnpm --filter @mercury/web   build

# ---- serve stage ----
FROM nginx:1.27-alpine AS runner

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
