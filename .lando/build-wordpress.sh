#!/bin/sh

# Download latest WordPress release and extract it
echo "Downloading latest WordPress release..."
cd /app
curl -O https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz
rm latest.tar.gz

echo "Relinking files..."
rm -f /app/wordpress/wp-config.php && ln -s /app/.lando/wp-config.php /app/wordpress/wp-config.php
rm -f /app/wordpress/phpinfo.php && ln -s /app/.lando/phpinfo.php /app/wordpress/phpinfo.php
rm -rf /app/wordpress/wp-content/plugins/wp-museum && ln -s /app /app/wordpress/wp-content/plugins/wp-museum
