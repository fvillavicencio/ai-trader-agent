FROM public.ecr.aws/lambda/nodejs:20

COPY package*.json ./
RUN npm install

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV HOME=/var/task
RUN npx playwright install chromium --with-deps

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
