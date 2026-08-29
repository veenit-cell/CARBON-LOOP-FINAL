# Traced standalone build of apps/web. `npm run build` compiles the six workspace
# packages first, so the build stage needs the whole repo, not just the app folder.
FROM node:22-alpine AS deps
WORKDIR /repo
# Playwright browsers are only needed by `npm run test:e2e`, never to build the app.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# Manifests only, so an unchanged dependency set reuses this layer.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/schemas/package.json packages/schemas/
COPY packages/carbon-engine/package.json packages/carbon-engine/
COPY packages/factor-registry/package.json packages/factor-registry/
COPY packages/quest-engine/package.json packages/quest-engine/
COPY packages/scoring/package.json packages/scoring/
COPY packages/marketplace/package.json packages/marketplace/
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /repo/node_modules node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# The standalone output already contains every traced dependency, so there is no
# install here. Static assets are not traced and are copied separately. The
# unprivileged runtime user must own the tree because Next writes its runtime cache
# under .next at request time.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
