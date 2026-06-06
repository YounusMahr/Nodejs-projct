FROM node:20-alpine

WORKDIR /app

# Copy package descriptors first to leverage Docker cache
COPY package*.json ./

# Install dependencies (only production)
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
