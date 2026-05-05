# Object Kinds & Fields

Object **kinds** are the types of museum objects your site catalogs — for example *Artifacts*, *Specimens*, or *Scientific Instruments*. Each kind is a dynamically registered custom post type with its own set of custom fields.

## Creating an object kind

1. Go to **Museum → Object Kinds** in the admin.
2. Click **Add New Kind**.
3. Give it a label (singular and plural) and an identifier.
4. Save.

Once saved, the kind appears in the admin sidebar as its own post type.

## Defining custom fields

Each kind has its own set of fields. From an object kind's edit screen:

1. Add fields with a name, type (text, number, select, etc.), and any per-type options.
2. Reorder fields as needed.
3. Save.

Field definitions automatically generate:

- Form controls in the object edit screen.
- REST API endpoints (see [REST API](rest-api.md)).
- Block attributes for display blocks like the object infobox.

!!! tip
    Field changes propagate immediately — no rebuild or cache flush required.

## Importing and exporting kinds

Object kinds (and their fields) can be exported and re-imported as JSON, which makes it easy to copy a configuration between sites or to keep a backup of your schema.

## Default kind

New installations include a default object kind to give you something to play with. You can edit, rename, or delete it freely.
