#!/bin/bash

# Reset test database only (for use from playwright service)
# This script only handles database reset since playwright service doesn't have WP-CLI
DB_NAME="${TEST_DB_NAME:-wptest}"
DB_USER="${TEST_DB_USER:-wptest}"
DB_PASS="${TEST_DB_PASS:-wptest}"
DB_HOST="${TEST_DB_HOST:-wp-test-database}"

echo "Resetting test database..."

# Reset database
/usr/bin/mariadb --skip-ssl -h$DB_HOST -u$DB_USER -p$DB_PASS << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

echo "Test database reset complete!"
