# Blocks

Museum for WordPress ships a set of Gutenberg blocks for searching, displaying, and navigating museum content. All blocks are available from the block inserter under the **Museum** category.

## Search blocks

### Basic Search

A search box with a results grid, for a dedicated search page. Visitors type a term, choose whether to search titles only or all fields, and get a paginated grid of matching objects. The form submits by GET, so every search and every results page has its own URL, and an Embedded Search block elsewhere on the site can send visitors here with a term filled in. Options: results per page, grid columns, and an optional link to an Advanced Search page.

### Advanced Search

A faceted search interface with filters for object kind, custom field values, and collection membership.

### Embedded Search

A compact search box for a sidebar, header, or landing page. It has no results of its own: submitting it sends the visitor to the search page you point it at (a page containing a Basic Search or Advanced Search block). Options: the search page URL, an optional Advanced Search link, a heading, a maximum width, and whether to show the "Only search titles" toggle.

## Display blocks

### Object Gallery

Displays a grid of museum objects, optionally filtered by kind or collection.

### Object Image

Shows a single object's image (primary or a chosen image from its gallery).

### Collection Objects {#collection-objects}

Renders the objects belonging to a specified collection.

## Meta blocks

### Object Meta

A flexible block for displaying selected metadata fields from a museum object.

### Object Infobox

A Wikipedia-style infobox dynamically generated from a kind's field definitions. Field changes flow through automatically.

## Navigation

### Collection Main Navigation {#collection-main-navigation}

A navigation block for browsing the hierarchical collection tree.
