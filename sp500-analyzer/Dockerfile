# Stage 1: Build dependencies in a clean Node.js environment
FROM node:20-slim as build

WORKDIR /app

COPY package*.json ./
RUN ls -l /app
RUN npm install

COPY lambda_function.js ./

# Stage 2: Use Playwright base image for Chromium/system deps
FROM mcr.microsoft.com/playwright:v1.43.1-jammy

WORKDIR /var/task

# Copy only the built node_modules, package.json, and handler from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/lambda_function.js ./

CMD [ "node_modules/aws-lambda-ric/bin/ric.js", "lambda_function.handler" ]
