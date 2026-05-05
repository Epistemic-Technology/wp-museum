# REST API

Museum for WordPress exposes a comprehensive REST API under the `wp-museum/v1` namespace, alongside the standard WordPress REST API.

## Base URL

```
https://your-site.example/wp-json/wp-museum/v1/
```

## Endpoints

The API includes controllers for:

- **Objects** — list, fetch, create, update museum objects.
- **Collections** — list and inspect collections, including hierarchy.
- **Object Kinds** — read kind definitions.
- **Custom Fields** — read field definitions for each kind.
- **Image Attachments** — fetch primary and gallery images for objects.
- **Admin Options** — read/write plugin options (admin only).
- **Site Data** — top-level metadata about the museum installation.
- **Remote Clients** — manage [Museum Remote](museum-remote.md) connections.

## Authentication

Read endpoints for published objects and collections are public. Write endpoints and admin endpoints require WordPress authentication (cookie auth for in-site requests, application passwords for external clients).

## Discovering schemas

Each endpoint exposes its schema via standard WordPress REST API conventions. Send an `OPTIONS` request to any endpoint URL to see its supported parameters and response shape.
