FROM public.ecr.aws/lambda/nodejs:20

# Install system dependencies for Chromium (Amazon Linux 2 names)
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
    GConf2 \
    dbus-glib \
    wget \
    && yum clean all

ENV HOME=/var/task

COPY package*.json ./
RUN npm install

RUN npx playwright install chromium

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
