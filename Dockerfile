# Stage 1: The Build/Development Stage

# Use an official Node.js image as the base.
FROM node:20-alpine AS development

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# to install dependencies
COPY package*.json ./

# Install dependencies.
RUN npm install --silent

# Copy the rest of the application code
COPY . .

# Expose the port the React development server runs on
EXPOSE 3000

# Command to start the application in development mode
CMD ["npm", "start"]