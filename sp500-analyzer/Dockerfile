FROM public.ecr.aws/lambda/nodejs:20

# Install ALL required system dependencies for Chromium
RUN yum install -y \
    alsa-lib \
    atk \
    cups-libs \
    gtk3 \
    ipa-gothic-fonts \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    libdrm \
    libgbm \
    nss \
    wget \
    libXinerama \
    libxcb \
    libX11-xcb \
    mesa-libgbm \
    libxshmfence \
    fontconfig \
    && yum clean all \
    && rm -rf /var/cache/yum

# Lambda/Playwright environment variables
ENV HOME=/tmp \
    PLAYWRIGHT_BROWSERS_PATH=/tmp \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    LAMBDA_TASK_ROOT=/var/task

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./
RUN npm install

# Install Playwright with Chromium and system dependencies
RUN npx playwright install chromium --with-deps \
    && mv /root/.cache/ms-playwright /tmp/playwright-cache

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
