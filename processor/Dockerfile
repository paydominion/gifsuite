# GifSuite media processor, run as a Cloudflare Container.
FROM node:24-alpine
RUN apk add --no-cache ffmpeg libwebp-tools yt-dlp
WORKDIR /app
COPY presets.mjs server.mjs ./
USER node
ENV PORT=8080 HOST=0.0.0.0 NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
