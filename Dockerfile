# Stage 1: Development base image
FROM node:20-alpine AS dev

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --silent

# Default command for development (npm start)
CMD ["npm", "start"]

# Stage 2: Production build (uses dev stage as base)
FROM dev AS build

# Copy all source code into container
COPY . .

# Build React app (creates build folder with static files)
RUN npm run build

# Stage 3: Production server using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React files from build stage into Nginx public folder
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
