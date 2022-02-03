FROM ubuntu:bionic

WORKDIR /app

RUN apt-get update \
    && apt-get -y --no-install-recommends install \
        ca-certificates \
        gcc \
        g++ \
        git \
        make \
        openssl \
        curl

RUN git clone -b OpenSSL_1_1_1b https://github.com/openssl/openssl.git \
    && cd openssl \
    && ./config \
    && make \
    && make install

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - \
    && apt-get install -y nodejs

COPY ./package.json /app

RUN npm install \
    && npm install -g nodemon \
    && npm audit fix

# chromium and puppeteer dependencies
RUN apt-get update \
    && apt-get -y --no-install-recommends install \
        chromium-browser \
        gconf-service \
        libasound2 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgcc1 \
        libgconf-2-4 \
        libgdk-pixbuf2.0-0 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        fonts-liberation \
        libappindicator1 \
        libnss3 \
        lsb-release \
        xdg-utils \
        wget

# do this as a separate step so we don't have to rebuild the image
# every time the app changes.

COPY . /app

EXPOSE 7777

ENTRYPOINT [ "npm" ]
CMD [ "run", "prod" ]
