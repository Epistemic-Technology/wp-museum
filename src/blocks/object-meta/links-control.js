import { __experimentalLinkControl as LinkControl } from "@wordpress/block-editor";
import { Button, Popover } from "@wordpress/components";
import { useState } from "@wordpress/element";
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
            <span className="wpm-link-row-label">
              {link.label || link.url || __("(untitled link)", "wp-museum")}
            </span>
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
