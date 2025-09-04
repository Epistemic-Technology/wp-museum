# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

### Build and Development
- `lando npm run build` - Build production assets using @wordpress/scripts
- `lando npm run start` - Start development server with watch mode
- `lando composer install` - Install PHP dependencies (coding standards, tests)

### Testing
- `lando phpunit` - Run PHPUnit tests (requires WordPress test environment)
- `lando phpunit-debug` - Run PHPUnit with xdebug enabled
- `lando test` - Reset test environment and run PHPUnit tests
- `lando test-reset` - Reset test WordPress to clean state
- `lando playwright` - Run Playwright end-to-end tests (includes automatic reset)
- `lando npm run test:e2e` - Alternative Playwright test command
- `lando npm run test:e2e:ui` - Run Playwright with interactive UI
- `lando npm run test:e2e:debug` - Debug Playwright tests
- `lando npm run test:e2e:headed` - Run Playwright with visible browser

### Code Quality
- `vendor/bin/phpcs` - Run PHP CodeSniffer with WordPress coding standards
- `vendor/bin/phpcs --standard=phpcs.xml.dist` - Full linting with custom rules
- PHP 8.2+ compatibility enforced via phpcs.xml.dist

### WordPress CLI
- `lando wp` - Run WP-CLI commands
- `lando wpd` - Run WP-CLI with xdebug enabled
- `lando wp-install` - Install WordPress (admin/admin credentials)

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
- **Test site**: https://wp-test.lndo.site (credentials: admin/admin)
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
- Use `lando playwright` for automatic test environment reset before tests
- Test environment runs on separate database (wptest) and server instance
