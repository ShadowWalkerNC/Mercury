FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/web

FROM nginx:alpine AS runner
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
EXPOSE 80
