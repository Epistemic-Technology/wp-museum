FROM php:8.2-fpm-alpine

RUN apk add --update nodejs npm bash git subversion apache2
COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions && \
    install-php-extensions exif imagick zip memcached redis mysqli intl yaml xdebug

# Install WP-CLI
RUN apk add --no-cache curl less mysql-client && \
    curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
    chmod +x wp-cli.phar && \
    mv wp-cli.phar /usr/local/bin/wp

RUN npm install -g npm@latest
