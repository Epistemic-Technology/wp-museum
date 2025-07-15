# WP Museum Development Guide

## Build/Test Commands
- **Build**: `npm run build` (production) or `npm start` (development watch mode)
- **PHP Tests**: `lando phpunit` or `lando phpunit-debug` (with xdebug)
- **Single PHP Test**: `lando phpunit tests/phpunit/test-{name}.php`
- **E2E Tests**: `npm run test:e2e` or `lando playwright`
- **PHP Linting**: `vendor/bin/phpcs` (uses WordPress-Extra standards)
- **JS Linting**: Uses @wordpress/scripts ESLint config

## Code Style
- **PHP**: WordPress Coding Standards with short array syntax allowed `[]`
- **JS/React**: WordPress standards via @wordpress/scripts, Prettier disabled
- **Namespacing**: `MikeThicke\WPMuseum` for all PHP classes
- **File naming**: `class-{name}.php` for classes, `{feature}.php` for includes
- **Imports**: Use WordPress dependencies (`@wordpress/*`) for blocks/components
- **Error handling**: Use WordPress functions (`wp_die()`, `is_wp_error()`)
- **Database**: Direct queries allowed, use `$wpdb` with proper escaping
- **Blocks**: Dynamic blocks with PHP render callbacks in `src/blocks/{name}/render.php`

## Environment
- **Lando**: Local development with custom WordPress test environment
- **PHP 8.2+**: Minimum version with compatibility checks via PHPCS