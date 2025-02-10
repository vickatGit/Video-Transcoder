# Stage 1: Build Stage
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy only the package.json and package-lock.json for dependency installation
COPY ./VideoEncodingService/package*.json ./ 

# Install dependencies
RUN npm install

# Copy the application source code
COPY ./VideoEncodingService ./ 

# Build the application
RUN npm run build


# Stage 2: Production Stage
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install FFmpeg (add this line to install FFmpeg in the production stage)
RUN apk update && apk add ffmpeg

# Copy the dist folder from the build stage
COPY --from=builder /app/dist ./dist

# Copy only the production dependencies
COPY ./VideoEncodingService/package*.json ./ 
RUN npm install --production

# Expose the application port
EXPOSE 3000

# Define the default command to run the application
CMD ["node", "dist/index.js"]
