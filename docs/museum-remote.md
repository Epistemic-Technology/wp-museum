# Museum Remote

**Museum Remote** is a companion plugin that lets other WordPress sites embed collections from a central Museum for WordPress site over the [REST API](rest-api.md).

This is useful when:

- A central institutional site hosts the canonical museum catalog.
- Departmental or partner sites want to display subsets of that catalog without duplicating data.

## Installation

Download the latest Museum Remote release from the [releases page](https://github.com/mikethicke/wp-museum/releases) and install it on the consuming WordPress site like any other plugin.

## Configuration

1. On the **central** Museum for WordPress site, register the remote site as a client to issue it credentials.
2. On the **consuming** site, install Museum Remote and enter the central site's URL and the credentials you generated.
3. Use Museum Remote's blocks to embed collections from the central site.

## Data flow

Museum Remote pulls data on demand from the central site over HTTPS. Object data, images, and field definitions are all fetched from the central site so that updates there propagate to consumers.
