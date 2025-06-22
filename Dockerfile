# Using an official Node.js base image
FROM node:20-alpine

# Working directory inside the container
WORKDIR /lab-backend

# Copying package.json and package-lock.json
COPY package*.json ./

# Installing project dependencies based on NODE_ENV
ARG NODE_ENV
RUN if [ "$NODE_ENV" = "production" ]; then npm install --omit=dev; else npm install; fi

# Copying the rest of the application
COPY . .

# Exposing the port where the application will run
EXPOSE 3001

# Setting the environment variable for development or production
ENV NODE_ENV $NODE_ENV

# Command to run the application
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'production' ]; then npm start; else npm run dev; fi"]