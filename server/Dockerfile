# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Your server runs on port 3000, so expose it
EXPOSE 3000

# Define the command to run your app
CMD [ "node", "server.js" ]