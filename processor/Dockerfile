# GifSuite media processor, run as a Cloudflare Container.
FROM node:24-alpine
RUN apk add --no-cache ffmpeg libwebp-tools yt-dlp
WORKDIR /app
# The NSFW model (nsfwjs + TensorFlow.js) is the only npm dependency; installed before the code so
# the layer stays cached across code-only changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY presets.mjs server.mjs nsfw.mjs fetch.mjs maker.mjs ./
USER node
ENV PORT=8080 HOST=0.0.0.0 NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
