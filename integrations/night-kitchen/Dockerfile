FROM node:22-alpine AS builder
WORKDIR /app
COPY integrations/night-kitchen/package*.json integrations/night-kitchen/tsconfig.json ./
RUN npm install
COPY integrations/night-kitchen/src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY integrations/night-kitchen/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
