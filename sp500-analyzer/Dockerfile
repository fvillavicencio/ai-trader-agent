FROM public.ecr.aws/lambda/provided:al2

# Install system dependencies for Chromium/Playwright
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
