import apiFetch from "@wordpress/api-fetch";
import { __experimentalLinkControl as LinkControl } from "@wordpress/block-editor";
import { Button, Popover } from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

/**
 * Editor for a "links" field — a mixed list of internal post references
 * and external URLs. Uses core's LinkControl popover for picking either.
 *
 * Stored shape (per item):
 *   { type: 'post' | 'url', post_id?: int, url?: string, label?: string }
 *
 * Internal links keep `url` as a cached snapshot for editor display, but
 * the public renderer re-resolves the post's current permalink at render
 * time so a renamed post still resolves correctly.
 */
const LinksControl = ({ value, onChange }) => {
  const links = Array.isArray(value) ? value : [];
  const [editingIndex, setEditingIndex] = useState(null);
  // post_id -> cat ID string, or "" if the target has no cat field.
  // "" is kept so we don't re-fetch a target that has none.
  const [catIds, setCatIds] = useState({});

  // For every internal-post link whose cat ID we haven't fetched yet,
  // call /wp-museum/v1/all/<id> — that endpoint returns the cat_field
  // slug plus all field values, so cat ID is `data[data.cat_field]`.
  // Non-museum-object posts (regular pages) return cat_field: null and
  // we cache an empty string to avoid retrying.
  useEffect(() => {
    const missing = links
      .filter(
        (l) => l.type === "post" && l.post_id && !(l.post_id in catIds),
      )
      .map((l) => l.post_id);
    if (missing.length === 0) return undefined;

    let cancelled = false;
    Promise.all(
      missing.map((id) =>
        apiFetch({ path: `/wp-museum/v1/all/${id}` })
          .then((data) => {
            const slug = data && data.cat_field;
            const catValue = slug && data[slug] ? String(data[slug]) : "";
            return [id, catValue];
          })
          .catch(() => [id, ""]),
      ),
    ).then((results) => {
      if (cancelled) return;
      setCatIds((prev) => {
        const next = { ...prev };
        for (const [id, val] of results) next[id] = val;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [links]);

  const labelFor = (link) => {
    const base = link.label || link.url || "";
    if (!base) return "";
    if (link.type === "post" && link.post_id) {
      const catId = catIds[link.post_id];
      if (catId) return `${base} (${catId})`;
    }
    return base;
  };

  const updateLink = (index, newLink) => {
    const next = links.slice();
    next[index] = newLink;
    onChange(next);
  };

  const removeLink = (index) => {
    onChange(links.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const addLink = () => {
    onChange(links.concat([{ type: "url", url: "", label: "" }]));
    setEditingIndex(links.length);
  };

  const linkControlValue = (link) => ({
    url: link.url || "",
    title: link.label || "",
    id: link.post_id || undefined,
  });

  const fromLinkControl = (next) =>
    next.id
      ? {
          type: "post",
          post_id: next.id,
          url: next.url || "",
          label: next.title || "",
        }
      : {
          type: "url",
          url: next.url || "",
          label: next.title || "",
        };

  return (
    <div className="wpm-links-control">
      <ul className="wpm-links-list">
        {links.map((link, index) => (
          <li key={index} className="wpm-link-row">
            {link.url ? (
              <a
                className="wpm-link-row-label"
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {labelFor(link)}
              </a>
            ) : (
              <span className="wpm-link-row-label wpm-link-row-label--empty">
                {link.label || __("(untitled link)", "wp-museum")}
              </span>
            )}
            <div className="wpm-link-row-actions">
              <Button
                variant="tertiary"
                size="small"
                onClick={() => setEditingIndex(index)}
              >
                {__("Edit", "wp-museum")}
              </Button>
              <Button
                variant="tertiary"
                size="small"
                isDestructive
                onClick={() => removeLink(index)}
              >
                {__("Remove", "wp-museum")}
              </Button>
            </div>
            {editingIndex === index && (
              <Popover
                placement="bottom-start"
                onClose={() => setEditingIndex(null)}
              >
                <LinkControl
                  value={linkControlValue(link)}
                  onChange={(next) =>
                    updateLink(index, fromLinkControl(next))
                  }
                  showInitialSuggestions
                />
              </Popover>
            )}
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={addLink}>
        {__("+ Add Link", "wp-museum")}
      </Button>
    </div>
  );
};

export default LinksControl;
