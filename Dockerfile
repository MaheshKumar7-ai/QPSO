# Node.js production image for Cloud Run
FROM node:20-alpine

WORKDIR /app

# Copy package descriptors and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code and build Vite static bundle
COPY . .
RUN npm run build

# Default PORT for local testing, Cloud Run overrides PORT dynamically
ENV PORT=3000
EXPOSE 3000

# Start production Express server
CMD ["node", "server.js"]
