# Stage 1: Build with Node.js 20 (npm, npx, Playwright)
FROM public.ecr.aws/lambda/nodejs:20 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Playwright with Chromium
RUN npx playwright install chromium

COPY lambda_function.js ./

# Stage 2: Amazon Linux 2 Lambda runtime with yum for system deps
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

# Copy everything from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/lambda_function.js ./
COPY --from=build /root/.cache/ms-playwright /tmp/playwright-cache

RUN ls -al /var/task

CMD [ "lambda_function.handler" ]
