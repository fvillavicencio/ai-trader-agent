# Stage 1: Build with Node.js 20 (npm, npx, Playwright)
FROM public.ecr.aws/lambda/nodejs:20 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Playwright with Chromium
RUN npx playwright install chromium

COPY lambda_function.js ./

# Stage 2: Official Playwright base image (v1.43.1-jammy) for Lambda compatibility
FROM mcr.microsoft.com/playwright:v1.43.1-jammy

WORKDIR /var/task

COPY --from=build /app/package*.json ./
RUN npm install

COPY --from=build /app/lambda_function.js ./

CMD [ "node_modules/aws-lambda-ric/bin/ric.js", "lambda_function.handler" ]
