FROM public.ecr.aws/lambda/nodejs:20

# Install system dependencies for Chromium
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
    && yum clean all

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Set HOME so Playwright installs browsers to a writable location
ENV HOME=/var/task

# Install Chromium only (not all browsers)
RUN npx playwright install chromium

# Copy your Lambda handler
COPY lambda_function.js ./

# Add a comment to trigger a new workflow
# Trigger build: 2025-04-18T18:59:09-04:00

CMD [ "lambda_function.handler" ]
