# Builds the client, then runs the game server, which also serves the built client.
# Node 24 for node:sqlite (the save database), matching the version on the PC.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY tsconfig.json ./
COPY shared ./shared
COPY server ./server
COPY --from=build /app/dist ./dist
EXPOSE 2567
CMD ["node", "--import", "tsx", "server/src/index.ts"]
