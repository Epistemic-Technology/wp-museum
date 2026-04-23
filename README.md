# Museum for WordPress

Museum for WordPress is a WordPress plugin that facilitates the operation of an
online museum. It is a full-featured museum management system that is tightly
integrated into the powerful and user-friendly WordPress software. It is
desiged to operate seamlessly with any WordPress theme, while also giving
administrators and authors full power to customize the appearance of museum
objects.

Administrators create museum objects with custom fields
and built-in image galleries. Collections display associated objects. The
appearance of objects and collections is fully configurable through the
WordPress customization API, and they can be integrated into posts and pages
throughout the site with widgets and Gutenberg blocks.

Using the [Museum Remote
plugin](https://github.com/mikethicke/wp-museum/tree/master/museum-remote),
other WordPress sites can embed collections from a central Museum for WordPress
site using the WordPress REST API.

## Installation

To install Museum for WordPress, unzip the [latest
release](https://github.com/mikethicke/wp-museum/releases/latest) in your
WordPress plugins directory or upload the release zip through the WordPress
plugin installer.

To install the Museum Remote plugin, download the [latest Museum Remote
release](https://github.com/mikethicke/wp-museum/releases) and unzip in your
WordPress plugins directory or through the WordPress plugin installer.

## Requirements

 * PHP 7.0+

## Roadmap

Museum for WordPress is under active development. Below are the main target
features up to the 1.0 release.

### 0.7

 * Import and export of museum object kinds ( via JSON ).
 * Default kind for new installations.
 * Allow administrators to write documentation for contributors.

### 0.8

 * React-based quick browse system for collection editors.
 * Allow administrators to write documentation for visitors.
 * Sidebar widgets for navigating collections.

### 0.9

 * Support for localization on admin side.
 * [Dublin core / oai-pmh](https://www.dublincore.org/) support.
 * Out-of-the-box compatibility with popular themes.

### 1.0

 * Optimization, coding standards, developer documentation.

### Beyond 1.0

 * Multilingual support. (Pending Gutenberg Phase 4.)

For detailed roadmap see the [project
page](https://github.com/mikethicke/wp-museum/projects/1).

## Development

The local environment runs on Docker Compose, orchestrated through `npm run`
scripts. Lando is still supported as an alternative; both share config via
symlinks from `.lando/` into `docker/`.

### Setup

1. `cp .env.example .env` and set `WP_HOME` to the URL your browser will hit
   (e.g. `http://localhost:8080`, or `http://<host>.<tailnet>.ts.net:8080` for
   remote development over Tailscale).
2. `npm run setup` — generates self-signed certs, builds the container image,
   starts services, installs dependencies, builds assets, downloads WordPress,
   and bootstraps both dev and test sites.

### Common commands

- `npm run up` / `npm run down` — start/stop services
- `npm run shell` — bash inside the dev container
- `npm run wp -- <args>` — WP-CLI
- `npm run test` — PHPUnit with automatic test-site reset
- `npm run test:e2e` — Playwright end-to-end tests
- `npm run lint` / `npm run lint:fix` — PHP coding standards

See [CLAUDE.md](CLAUDE.md) for the full command reference.

### Lando (alternative)

All existing `lando <cmd>` tooling continues to work against the same config.

## Authors

Museum for WordPress is developed by [Mike Thicke](http://www.mikethicke.com/).

## Support

Development is partially supported by the [University of Toronto Scientific
Instrument Collection (UTSIC)](https://utsic.utoronto.ca/) and the [Dunlap
Institute for Astronomy and Astrophysics](https://www.dunlap.utoronto.ca).

## License

This project is licensed under the [GNU General Public License, version 2 or later](LICENSE.md).
