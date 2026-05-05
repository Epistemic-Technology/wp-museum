# Collections

Collections group museum objects into themed sets — for example *Optical Instruments*, *Mesozoic Fossils*, or a temporary exhibit. They are implemented as a custom post type (`wpm_collection`) backed by a dedicated custom taxonomy (`wpm_collection_tax`) that replaces standard WordPress categories for museum objects.

## Creating a collection

1. Go to **Collections → Add New** in the admin.
2. Add a title and description.
3. Optionally choose a parent collection to nest it.
4. Publish.

## Adding objects to a collection

From any museum object's edit screen, assign it to one or more collections from the Collections sidebar panel. Objects can belong to multiple collections.

## Hierarchy

Collections support arbitrary parent/child nesting. This is useful for breaking large collections into sub-collections (e.g. *Optical Instruments → Telescopes → Refractors*).

## Displaying collections

Use the [Collection Objects](blocks.md#collection-objects) and [Collection Main Navigation](blocks.md#collection-main-navigation) blocks to embed collections in posts and pages.
