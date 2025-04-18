FROM public.ecr.aws/lambda/nodejs:20

# Install dependencies needed for Playwright (Chromium)
RUN yum install -y \
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
    wget \
    && yum clean all

# Install Playwright and Chromium
COPY package*.json ./
RUN npm install
ENV HOME=/var/task
RUN npx playwright install chromium

COPY lambda_function.js ./

CMD [ "lambda_function.handler" ]
