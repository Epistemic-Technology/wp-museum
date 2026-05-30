import apiFetch from "@wordpress/api-fetch";
import { __experimentalLinkControl as LinkControl } from "@wordpress/block-editor";
import { Button, Popover, TextControl } from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

/**
 * Editor for a "links" field — a mixed list of internal post references
 * and external URLs. Uses core's LinkControl popover for picking either.
 *
 * Stored shape (per item):
 *   { type: 'post' | 'url', post_id?: int, url?: string, label?: string }
 *
 * `label` is the user's custom override (typed into the popover's "Custom
 * label" field) and is empty by default. The public renderer mirrors:
 *   - empty label  → auto-derived (post title + cat ID, or the URL)
 *   - filled label → rendered verbatim, no cat ID appended
 *
 * Internal post titles and cat IDs are looked up async via
 * /wp-museum/v1/all/<id> and cached so the editor stays consistent with
 * what readers will see.
 */
const LinksControl = ({ value, onChange }) => {
  const links = Array.isArray(value) ? value : [];
  const [editingIndex, setEditingIndex] = useState(null);
  // post_id -> { title, catId }. `catId` is "" when the target has no cat
  // field; both keys present means we've already fetched (don't retry).
  const [postInfo, setPostInfo] = useState({});

  // For every internal-post link we haven't fetched yet, call
  // /wp-museum/v1/all/<id> — that endpoint returns the post title, the
  // cat_field slug, and all field values. Non-museum-object posts
  // (regular pages) return cat_field: null and we cache an empty cat ID
  // so we don't retry.
  useEffect(() => {
    const missing = links
      .filter(
        (l) => l.type === "post" && l.post_id && !(l.post_id in postInfo),
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
            const title = data && data.post_title ? String(data.post_title) : "";
            return [id, { title, catId: catValue }];
          })
          .catch(() => [id, { title: "", catId: "" }]),
      ),
    ).then((results) => {
      if (cancelled) return;
      setPostInfo((prev) => {
        const next = { ...prev };
        for (const [id, info] of results) next[id] = info;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [links]);

  const labelFor = (link) => {
    // Custom label always wins, no cat ID appended.
    if (link.label) return link.label;
    if (link.type === "post" && link.post_id) {
      const info = postInfo[link.post_id];
      const title = info && info.title ? info.title : link.url || "";
      const catId = info && info.catId ? info.catId : "";
      return catId ? `${title} (${catId})` : title;
    }
    return link.url || "";
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

  // Preserve the user's custom label across LinkControl re-picks. Don't
  // copy LinkControl's auto-derived `title` into our `label` field —
  // that would defeat the "label set ⇒ user customized" signal.
  const fromLinkControl = (next, prev) =>
    next.id
      ? {
          type: "post",
          post_id: next.id,
          url: next.url || "",
          label: (prev && prev.label) || "",
        }
      : {
          type: "url",
          url: next.url || "",
          label: (prev && prev.label) || "",
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
                <div className="wpm-link-edit-popover">
                  <LinkControl
                    value={linkControlValue(link)}
                    onChange={(next) =>
                      updateLink(index, fromLinkControl(next, link))
                    }
                    showInitialSuggestions
                  />
                  <div className="wpm-link-edit-popover__label-override">
                    <TextControl
                      label={__("Custom label (optional)", "wp-museum")}
                      help={__(
                        "Overrides the post title or URL when shown to readers.",
                        "wp-museum",
                      )}
                      value={link.label || ""}
                      onChange={(val) =>
                        updateLink(index, { ...link, label: val })
                      }
                    />
                  </div>
                </div>
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
