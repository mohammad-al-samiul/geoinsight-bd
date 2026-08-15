FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS deps-prod
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install --no-save prisma@^6.6.0

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p feeds
RUN npx prisma generate
RUN npm run build

FROM base AS production
RUN apk add --no-cache wget
ENV NODE_ENV=production
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/feeds ./feeds
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
CMD ["sh", "-c", "DATABASE_URL=\"${DIRECT_DATABASE_URL:-$DATABASE_URL}\" npx prisma migrate deploy && node dist/app.js"]
