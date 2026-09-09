FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci --omit=dev --workspace=server

COPY server ./server
USER node
EXPOSE 5000
CMD ["npm", "run", "start", "--workspace=server"]
