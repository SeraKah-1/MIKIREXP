# Use lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package data
COPY package.json ./

# Install production dependencies
RUN npm install --production

# Copy source code
COPY index.js ./

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run the server
CMD ["node", "index.js"]
