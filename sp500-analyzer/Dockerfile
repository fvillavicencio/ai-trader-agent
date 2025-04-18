FROM mcr.microsoft.com/playwright/aws-lambda:v1.35.1

COPY package*.json ./
RUN npm install --omit=dev

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
