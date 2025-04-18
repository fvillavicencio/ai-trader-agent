FROM mcr.microsoft.com/playwright/aws-lambda:v1.42.1

# Install AWS Lambda Runtime Interface Client (RIC)
# RUN npm install aws-lambda-ric

# Copy your Lambda handler and dependencies
COPY package*.json ./
RUN npm install --omit=dev

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
