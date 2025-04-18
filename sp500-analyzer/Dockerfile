FROM public.ecr.aws/lambda/nodejs:20

COPY package*.json ./
RUN npm install

ENV HOME=/var/task
RUN npx playwright install chromium

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
