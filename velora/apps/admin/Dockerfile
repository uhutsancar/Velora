# Build context is the repository root:
#   docker build -f velora/apps/admin/Dockerfile #     --build-arg VITE_API_URL=https://api.velora.com #     -t velora/admin:latest .
#
# Vite inlines VITE_* at build time, so these are build args, not runtime env.
# A different API host means a different image.

FROM node:20-alpine AS build
WORKDIR /repo

RUN corepack enable

# Manifests first so the install layer is reused while only sources change.
COPY velora/package.json velora/pnpm-lock.yaml velora/pnpm-workspace.yaml velora/.npmrc ./
COPY velora/packages/shared/package.json ./packages/shared/
COPY velora/apps/storefront/package.json ./apps/storefront/
COPY velora/apps/admin/package.json ./apps/admin/

RUN pnpm install --frozen-lockfile

COPY velora/ ./

ARG VITE_API_URL=http://localhost:5000
ARG VITE_MEDIA_ORIGIN=http://localhost:5004
ARG VITE_STOREFRONT_URL=http://localhost:5173
ARG VITE_APP_NAME="Velora Admin"
ARG VITE_CURRENCY=TRY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MEDIA_ORIGIN=$VITE_MEDIA_ORIGIN
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_CURRENCY=$VITE_CURRENCY

RUN pnpm --filter @velora/shared build && pnpm --filter @velora/admin build

FROM nginx:1.27-alpine AS final

COPY velora/apps/admin/security-headers.conf /etc/nginx/velora-security-headers.conf
COPY velora/apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html

EXPOSE 80
