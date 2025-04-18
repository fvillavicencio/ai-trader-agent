FROM public.ecr.aws/lambda/nodejs:20

# Install system dependencies for Chromium (corrected package names)
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
    gconf2 \
    dbus-glib \
    wget \
    && yum clean all

# Use writable directory for Chromium
ENV HOME=/tmp

COPY package*.json ./
RUN npm install

# Install Playwright with Chromium and system dependencies
RUN npx playwright install chromium --with-deps

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
