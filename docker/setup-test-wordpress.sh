#!/bin/bash

# Setup clean WordPress installation for E2E testing
TEST_WP_DIR="/app/wordpress-test"
DB_NAME="${TEST_DB_NAME:-wptest}"
DB_USER="${TEST_DB_USER:-wptest}"
DB_PASS="${TEST_DB_PASS:-wptest}"
DB_HOST="${TEST_DB_HOST:-wp-test-database}"

echo "Setting up test WordPress..."

# Create directory
mkdir -p $TEST_WP_DIR

# Download WordPress
cd /tmp
curl -O https://wordpress.org/latest.tar.gz
tar --strip-components=1 -xzf latest.tar.gz -C $TEST_WP_DIR
rm latest.tar.gz

cp /app/.lando/wp-config-test.php $TEST_WP_DIR/wp-config.php

# Link your plugin
rm -rf $TEST_WP_DIR/wp-content/plugins/wp-museum
ln -s /app $TEST_WP_DIR/wp-content/plugins/wp-museum

echo "Test WordPress setup complete!"
