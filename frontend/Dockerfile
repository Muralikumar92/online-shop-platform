# --- build stage ---
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@11
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-maxtimeout=120000
COPY . .
RUN npm run build

# --- runtime stage ---
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
ENTRYPOINT ["node", "server.js"]
