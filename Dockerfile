# Pre-built dist is committed to the repo (VPS cannot reach Cloudflare CDNs).
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci --omit=dev
COPY dist ./dist
COPY ecosystem.config.js ./
EXPOSE 80
CMD ["npm", "run", "start:cluster"]
