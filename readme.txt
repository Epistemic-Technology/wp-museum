=== Museum for WordPress ===
Contributors: mikethicke
Tags: museum, collection, gallery, archive, catalog
Requires at least: 6.2
Tested up to: 6.7
Requires PHP: 8.2
Stable tag: 0.8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A full-featured museum management system for WordPress. Catalog objects, build collections, and display them with blocks.

== Description ==

Museum for WordPress is a full-featured museum management system built directly into WordPress. It lets curators and administrators catalog museum objects with custom fields and image galleries, organize them into hierarchical collections, and embed objects and collections throughout the site using Gutenberg blocks.

**Features**

* Define custom **object kinds** (e.g. artifacts, specimens, instruments) with per-kind custom fields.
* Per-object **image galleries** with a primary image and unlimited additional images.
* **Collections** with hierarchical parent/child relationships and a dedicated custom taxonomy.
* A rich set of **Gutenberg blocks**:
  * Basic search, advanced search, embedded search
  * Object gallery, object image, collection objects
  * Object meta / infobox (dynamically generated from field definitions)
  * Collection main navigation
* **REST API** (namespace `wp-museum/v1`) for objects, collections, object kinds, custom fields, and image attachments.
* **Museum Remote** companion plugin lets other WordPress sites embed collections from a central museum site.
* **Capability-based security** — custom roles and capabilities control access to museum features independently of standard post permissions.
* Fully internationalizable (`wp-museum` text domain, `languages/` path).

**Requirements**

* WordPress 6.2 or later
* PHP 8.2 or later

== Installation ==

1. Upload the plugin zip through **Plugins → Add New → Upload Plugin**, or extract it into `wp-content/plugins/`.
2. Activate **Museum for WordPress** through the **Plugins** menu.
3. Visit **Museum → Object Kinds** to define your first object type and its custom fields.
4. Create collections via **Collections**, then start cataloging objects from the custom post type sidebar.
5. Use the Museum blocks in the block editor to display objects and collections anywhere on your site.

== Frequently Asked Questions ==

= How do I define what fields a museum object has? =

Object kinds and their fields are configured from the **Museum → Object Kinds** admin screen. Each kind can have any number of custom fields (text, number, select, etc.), and fields propagate automatically into the admin UI, the REST API, and the object display blocks.

= Can I share collections across multiple sites? =

Yes — install the **Museum Remote** companion plugin on the consuming site. It pulls collections and objects from your central Museum for WordPress site over the WordPress REST API.

= Does it support multilingual content? =

The plugin is fully translation-ready (text domain `wp-museum`). Full multilingual object content is on the roadmap pending Gutenberg Phase 4.

= Where is the source code? =

https://github.com/mikethicke/wp-museum

== Changelog ==

= 0.8.0 =
* First release submitted to the WordPress.org plugin directory.
* Relicensed under GPLv2-or-later.
* Security hardening: ABSPATH guards across all plugin PHP files; output escaping and input sanitization for admin-side migration flows.
* React-based quick-browse system for collection editors.
* Sidebar widgets for collection navigation.

= 0.7.x =
* JSON import/export of museum object kinds.
* Default object kind for new installations.
* Administrator-authored documentation for contributors.

== Upgrade Notice ==

= 0.8.0 =
First public release. Review the new admin capabilities after upgrade.
