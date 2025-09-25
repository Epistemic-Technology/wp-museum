import { useSelect, useDispatch } from "@wordpress/data";
import { registerPlugin } from "@wordpress/plugins";
import {
  PluginDocumentSettingPanel,
  store as editorStore,
} from "@wordpress/editor";
import { ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { museum } from "../icons";

const Panel = () => {
  const { meta, postType } = useSelect((select) => {
    const editor = select(editorStore);
    return {
      meta: editor.getEditedPostAttribute("meta") || {},
      postType: editor.getCurrentPostType(),
    };
  }, []);

  const { editPost } = useDispatch(editorStore);

  const handleToggle = (value: boolean) => {
    // Preserve existing meta values when updating
    editPost({
      meta: {
        include_oai_pmh: value,
      },
    });
  };

  return (
    <PluginDocumentSettingPanel
      name="wp-museum-oai-pmh-panel"
      title={__("Museum Settings", "wp-museum")}
      className="wp-museum-post-settings"
      icon={museum}
    >
      <ToggleControl
        label={__("Include in OAI-PMH", "wp-museum")}
        checked={meta.include_oai_pmh !== false}
        onChange={handleToggle}
        help={__(
          "When enabled, this object will be included in OAI-PMH data feeds.",
          "wp-museum",
        )}
      />
    </PluginDocumentSettingPanel>
  );
};

registerPlugin("wp-museum-oai-pmh-panel", { render: Panel });
