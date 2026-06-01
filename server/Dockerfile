FROM node:20-slim AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies
RUN npm ci

COPY . .

# Generate Prisma Client and build TypeScript files
RUN npx prisma generate
RUN npm run build

# Prune development dependencies
RUN npm prune --production

FROM node:20-slim

WORKDIR /app

# Install runtime openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

CMD ["npm", "run", "start"]
