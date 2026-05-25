FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
