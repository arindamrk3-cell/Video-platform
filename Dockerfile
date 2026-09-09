FROM node:24-bookworm-slim

# Install FFmpeg
RUN apt-get update \
    && apt-get install -y ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package*.json ./

RUN npm ci --omit=dev

# Copy application source
COPY . .

ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]