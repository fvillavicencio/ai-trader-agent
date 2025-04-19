FROM public.ecr.aws/lambda/nodejs:20

# Install ALL required system dependencies for Chromium (Debian package names)
RUN apt-get update && \
    apt-get install -y \
    libasound2 \
    libatk1.0-0 \
    cups-common \
    libgtk-3-0 \
    fonts-ipafont-gothic \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxi6 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    wget \
    libxinerama1 \
    libxcb1 \
    libx11-xcb1 \
    mesa-utils \
    libxshmfence1 \
    fontconfig \
    x11-utils \
    xfonts-100dpi \
    xfonts-75dpi \
    xfonts-cyrillic \
    xfonts-base \
    xfonts-scalable \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV HOME=/tmp \
    PLAYWRIGHT_BROWSERS_PATH=/tmp \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    LAMBDA_TASK_ROOT=/var/task

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./
RUN npm install

RUN npx playwright install chromium --with-deps \
    && mv /root/.cache/ms-playwright /tmp/playwright-cache

COPY lambda_function.js ./

RUN ls -al /var/task

CMD [ "lambda_function.handler" ]
