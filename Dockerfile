FROM node:20-alpine

WORKDIR /app

COPY claim-alert-agent/package*.json ./
RUN npm install --include=dev

COPY claim-alert-agent/tsconfig.json ./
COPY claim-alert-agent/src ./src

RUN npm run build

CMD ["node", "dist/agent.js"]
