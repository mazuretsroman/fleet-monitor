FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY migrations ./migrations
COPY scripts ./scripts
COPY src ./src

USER node
EXPOSE 3000

CMD ["sh", "-c", "node scripts/migrate.js up && node scripts/seed.js && node src/server.js"]
