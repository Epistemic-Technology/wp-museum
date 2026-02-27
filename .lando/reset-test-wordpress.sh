#!/bin/bash

# Reset test WordPress to clean state
DB_NAME="${TEST_DB_NAME:-wptest}"
DB_USER="${TEST_DB_USER:-wptest}"
DB_PASS="${TEST_DB_PASS:-wptest}"
DB_HOST="${TEST_DB_HOST:-wp-test-database}"

echo "Resetting test WordPress..."

# Reset database
/usr/bin/mariadb --skip-ssl -h$DB_HOST -u$DB_USER -p$DB_PASS << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

# Install WordPress
wp core install \
  --url=https://wp-test-server_nginx.wpmuseum.internal \
  --title="Test Museum Site" \
  --admin_user="${TEST_WP_ADMIN_USER:-admin}" \
  --admin_password="${TEST_WP_ADMIN_PASS:-admin}" \
  --admin_email="${TEST_WP_ADMIN_EMAIL:-admin@test.com}" \
  --skip-email \
  --path=/app/wordpress-test \

# Activate the wp-museum plugin
wp plugin activate wp-museum --path=/app/wordpress-test

echo "Test WordPress reset complete!"
