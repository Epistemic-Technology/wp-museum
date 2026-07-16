# Dashboard

The Museum Dashboard (**Museum → Dashboard** in the admin) gives an overview of the site's data and quick access to common tasks.

## Quick Actions

Shortcuts to the things you do most often:

- **Add `<Kind>`** — one link per object kind, opens a new post of that kind.
- **Add Collection** — create a new collection.
- **Manage Object Kinds** — jump to the object kind configuration screen.
- **Import/Export CSV** — bulk import or export objects.

<!-- ![Quick Actions panel](assets/dashboard/quick-actions.png) -->

## Health

The Health panel runs a set of checks against your site's data and configuration, and flags anything that needs attention. When everything passes, it shows a single green "All checks passed" line.

<!-- ![Health panel, all checks passed](assets/dashboard/health-all-clear.png) -->

Checks include:

- Missing custom database tables, or a schema version mismatch.
- Object kinds with no fields defined, or no catalogue ID field set.
- Invalid OAI-PMH mappings.
- Remote requests allowed from unregistered domains.
- Published objects missing required field values.
- Published objects missing a featured image or gallery, where the kind requires one.
- Objects with empty or duplicate catalogue IDs.

<!-- ![Health panel with warnings](assets/dashboard/health-warnings.png) -->

Each warning links to where the problem can be fixed:

- Object-level warnings (missing fields, missing images, duplicate catalogue IDs) open the objects list filtered to just the affected objects. For duplicates, the list is sorted by catalogue ID so the duplicate pairs sit next to each other.
- Kind configuration warnings link directly into that kind's editor.
- The remote access warning links to the [Museum Remote](museum-remote.md) settings page.

Results are cached for 10 minutes; click **Refresh** on the panel to re-run the checks immediately.
