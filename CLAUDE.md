# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

The default local environment is Docker Compose, driven through `npm run` scripts. Lando is still supported as an alternative — config shared via symlinks from `.lando/` to `docker/`.

### First-time setup
1. `cp .env.example .env` and set `WP_HOME` to the URL you'll use in the browser (e.g. `http://localhost:8080` or `http://<host>.<tailnet>.ts.net:8080` for remote dev over Tailscale).
2. `npm run setup` — generates self-signed certs, builds the image, starts services, installs npm/composer deps, builds assets, downloads WordPress, installs WP, sets up the test site, and installs Playwright deps.

### Lifecycle
- `npm run up` / `npm run down` / `npm run restart` / `npm run rebuild`
- `npm run logs` / `npm run ps`
- `npm run shell` / `npm run shell:test` - Bash inside dev/test php-fpm container
- `npm run certs:generate` - (Re)generate self-signed SSL certs in `docker/certs/`

### Build and Development
- `npm run build` - Build production assets using @wordpress/scripts (runs on host)
- `npm run start` - Start development server with watch mode (runs on host)
- `npm run composer:install` - Install PHP dependencies inside the container

### Testing
- `npm run phpunit` - Run PHPUnit tests
- `npm run phpunit:debug` - Run PHPUnit with xdebug enabled
- `npm run test` - Reset test environment and run PHPUnit tests
- `npm run test:reset` - Reset test WordPress to clean state
- `npm run test:e2e` - Run Playwright end-to-end tests (includes automatic reset)
- `npm run test:e2e:ui` - Run Playwright with interactive UI
- `npm run test:e2e:debug` - Debug Playwright tests
- `npm run test:e2e:headed` - Run Playwright with visible browser

### Code Quality
- `npm run lint` - Run PHP CodeSniffer with WordPress coding standards (delegates to `composer run-script lint`)
- `npm run lint:fix` / `npm run format` - Auto-fix via phpcbf
- PHP 8.2+ compatibility enforced via phpcs.xml.dist

### WordPress CLI
- `npm run wp -- <args>` - Run WP-CLI commands
- `npm run wp:debug -- <args>` - Run WP-CLI with xdebug enabled
- `npm run wp:install` - Install WordPress (admin/admin credentials, URL from `WP_HOME`)

### Database
- `npm run mysql` - Open MySQL shell against dev database
- `npm run mysql:test` - Open MySQL shell against test database

### Lando (alternative)
All legacy `lando <cmd>` tooling from `.lando.yml` remains functional (`lando wp`, `lando phpunit`, `lando test`, `lando playwright`, etc.).

## Plugin Architecture Overview

### Core Structure
This is a WordPress plugin called "Museum for WordPress" that manages museum objects and collections. The plugin uses a sophisticated architecture with:

**Main Plugin File**: `wp-museum.php` (namespace: `MikeThicke\WPMuseum`)
- Entry point with constants and autoloading
- New PHP files need to be explicitly required in wp-museum.php
- DEV_BUILD constant controls development vs production structure
- Version 0.6.73 with WordPress 6.2+ requirement
- PHP 8.4 compatibility in development environment

### Key Directories
- **`src/`** - Core plugin code organized by function
  - `classes/` - Core PHP classes (ObjectPostType, ObjectKind, MObjectField)
  - `includes/` - WordPress integration functions
  - `blocks/` - Gutenberg blocks with editor/frontend separation
  - `rest/` - REST API controllers (namespace: wp-museum/v1)
  - `admin-react/` - React-based admin interface
  - `components/` - Reusable React components
- **`tests/`** - Testing infrastructure
  - `phpunit/` - Backend PHP tests
  - `playwright/` - End-to-end browser tests
- **`build/`** - Compiled assets from webpack

### Database Architecture
**Custom Tables**:
- `wpm_mobject_kinds` - Museum object type definitions
- `wpm_mobject_fields` - Custom field definitions per object type
- `wpm_remote_clients` - Remote client connections

**Dynamic Post Types**: Object types are stored in database and dynamically converted to WordPress post types, enabling runtime customization.

**Collection System**: 
- Custom post type: `wpm_collection`
- Custom taxonomy: `wpm_collection_tax` (replaces WordPress categories)
- Hierarchical structure with parent-child relationships

### Block System
Gutenberg blocks provide flexible content display:
- **Search blocks**: `basic-search`, `advanced-search`, `embedded-search`
- **Display blocks**: `object-gallery`, `object-image`, `collection-objects`
- **Meta blocks**: `object-meta`, `object-infobox` (dynamically generated)
- **Navigation blocks**: `collection-main-navigation`

Each block has:
- `index.js` - Block registration
- `edit.js` - Editor interface
- `front.js` - Frontend functionality (if needed)
- `render.php` - Server-side rendering
- `block.json` - Block metadata

### REST API
Comprehensive REST API with controllers for:
- Objects, Collections, Object Types (Kinds)
- Custom Fields, Image Attachments
- Admin Options, Site Data, Remote Clients

### Testing Environment
- **Playwright tests**: Use utilities in `tests/playwright/utils.js`
- **Test site**: Reached internally at `http://nginx-test` (Docker Compose) or `https://wp-test.lndo.site` (Lando). Credentials: admin/admin. Override with `TEST_SITE_URL` in `.env`.
- **Helper functions**: Object creation, plugin activation, admin login
- **PHPUnit**: WordPress test framework integration
- **Available test specs**: 
  - CSV export, HTML entities handling
  - Basic search block, museum object kinds
  - WordPress and plugin basic functionality

## Development Patterns

### Field-Based Metadata System
Custom fields are defined in database and automatically generate:
- Form controls in admin interface
- REST API endpoints
- Block attributes and controls

### Hierarchical Object Relationships
Both collections and objects support parent-child relationships for complex organizational structures.

### Capability-Based Security
Custom capabilities control access to plugin features based on user roles.

### Asset Management
Webpack build process with:
- Asset dependency tracking
- Development/production mode switching
- SCSS compilation for block styles

## Important Notes

### Code Standards
- WordPress coding standards with custom exceptions in phpcs.xml.dist
- Short array syntax allowed (overrides WordPress-Extra)
- Direct database queries permitted for plugin functionality
- PHP 8.2+ compatibility required

### Development vs Production
- DEV_BUILD constant in wp-museum.php controls code structure
- Development: Source files in `src/` directory
- Production: Flattened structure for WordPress installation

### Testing
- Playwright tests require WordPress test environment
- Tests use comprehensive utilities for object/collection creation
- Use `npm run test:e2e` (or `lando playwright`) for automatic test environment reset before tests
- Test environment runs on separate database (wptest) and server instance

### Container Layout
- `docker/` - Source of truth for Dockerfile, nginx confs, php.ini, wp-configs, and setup/reset shell scripts
- `.lando/` - Contains symlinks back into `docker/` so Lando and Docker Compose share the same files
- `docker-compose.yml` - Defines `fpm`, `nginx`, `database` (dev network) and `fpm-test`, `nginx-test`, `fpm-test-db`, `playwright` (test network). Each php-fpm service is aliased `fpm` on its network so nginx confs work unchanged in both Lando and Compose.
