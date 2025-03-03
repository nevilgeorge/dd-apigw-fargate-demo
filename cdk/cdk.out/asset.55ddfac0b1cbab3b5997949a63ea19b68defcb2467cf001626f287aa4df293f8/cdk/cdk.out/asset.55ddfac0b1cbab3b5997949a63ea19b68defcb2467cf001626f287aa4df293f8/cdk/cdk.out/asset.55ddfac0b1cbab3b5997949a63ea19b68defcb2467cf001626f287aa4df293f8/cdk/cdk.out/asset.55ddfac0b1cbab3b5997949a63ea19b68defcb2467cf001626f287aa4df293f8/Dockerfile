# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (to leverage caching)
COPY package.json package-lock.json ./

# Install ALL dependencies including devDependencies
RUN npm install

# Debug: Check if TypeScript is installed
RUN npx tsc --version

# Copy the full project
COPY . .

# Build the TypeScript app
RUN npm run build

# -------------------------
# Production Image
# -------------------------
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy only necessary files from the builder stage
COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./
COPY --from=builder /usr/src/app/dist ./dist

# Install production dependencies only
RUN npm install --omit=dev

# Expose the application port
EXPOSE 3000

# Run the built JavaScript file
CMD ["node", "dist/server.js"]
