FROM node:23-alpine AS real

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data

USER nodejs

EXPOSE 3000

CMD ["node", "src/server.ts"]

# TODO: remove this stage, remove `AS real` from the first target once the real image is fixed.
# TODO: note that we now abuse the fact that `docker build` by default builds the last target in Justfile.
FROM node:23-alpine AS fake

RUN apk add --update curl

WORKDIR /usr/src/app
# So that the AWS healthchecks pass
RUN touch health
USER node

ENTRYPOINT ["sh"]
CMD ["-euc", "npx -y http-server --port ${PORT}"]
