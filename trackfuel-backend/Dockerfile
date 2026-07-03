FROM node:20-bookworm AS builder

LABEL maintainer="soozey.officiel@gmail.com"
ENV NODE_ENV=development
WORKDIR /app
  
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
  
COPY package*.json ./
  
RUN npm ci --no-audit --no-fund
  
COPY . .
  
FROM node:20-alpine AS runtime
  
ENV NODE_ENV=production
ENV PORT=8086
ENV UPLOAD_DIR=/app/uploads
WORKDIR /app
  
COPY package*.json ./
  
RUN npm ci --omit=dev --no-audit --no-fund
  
COPY --from=builder /app/src ./src

RUN mkdir -p /app/uploads/pleins && chown -R node:node /app
USER node
  
EXPOSE 8086
  
CMD ["node", "src/server.js"]
  
