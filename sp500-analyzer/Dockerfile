# Stage 1: Build dependencies in a clean Node.js environment
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN apt-get update && \
    apt-get install -y cmake autoconf automake libtool build-essential python3 && \
    rm -rf /var/lib/apt/lists/*
RUN ls -l /app
RUN npm install

COPY lambda.js ./
COPY analyzeSP500.js ./
COPY services ./services
COPY forward_eps_estimates.json ./
COPY services/sp-500-eps-est.xlsx ./services/

# Stage 2: Use Playwright base image for Chromium/system deps
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /var/task

# Copy only the built node_modules, package.json, and handler from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/lambda.js ./
COPY --from=build /app/analyzeSP500.js ./
COPY --from=build /app/services ./services
COPY --from=build /app/forward_eps_estimates.json ./
COPY --from=build /app/services/sp-500-eps-est.xlsx ./services/

CMD [ "node_modules/.bin/aws-lambda-ric", "--es-module-specifier-resolution=node", "lambda.handler" ]
