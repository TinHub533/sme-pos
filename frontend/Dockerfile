# deps: install dependencies in their own layer, cached unless package.json/
# package-lock.json change.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# builder: needs BACKEND_URL unset at build time — every backend call goes
# through this app's own Route Handlers reading process.env at request time
# (see lib/api.ts), not baked into the client bundle, so no build ARG needed.
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runner: output: "standalone" (next.config.mjs) traces only the files each
# route needs, so the image ships without the full node_modules tree.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
