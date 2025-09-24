import apiFetch from "@wordpress/api-fetch";

import { useState, useEffect } from "@wordpress/element";

import { Button } from "@wordpress/components";

import { __ } from "@wordpress/i18n";

import { baseRestPath } from "../util";

const GeneralOptions = () => {
  const [siteOptions, updateSiteOptions] = useState({});

  const {
    clear_data_on_uninstall,
    show_post_status,
    collection_override_taxonomy,
  } = siteOptions;

  useEffect(() => {
    refreshSiteOptions();
  }, []);

  const refreshSiteOptions = () => {
    apiFetch({ path: `${baseRestPath}/admin_options` }).then((response) => {
      updateSiteOptions(response);
      return response;
    });
  };

  const doSave = () => {
    apiFetch({
      path: `${baseRestPath}/admin_options`,
      method: "POST",
      data: siteOptions,
    });
  };

  const updateOption = (option, newValue) => {
    const updatedOptions = Object.assign({}, siteOptions);
    updatedOptions[option] = newValue;
    updateSiteOptions(updatedOptions);
  };

  return (
    <div className="museum-admin-main">
      <div className="admin-header">
        <h1>General Settings</h1>
        <p>
          Configure general plugin behavior and settings that affect how the
          Museum for WordPress plugin operates on your site.
        </p>
      </div>

      {siteOptions && (
        <>
          <div className="options-list">
            <div className="option-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clear_data_on_uninstall"
                  checked={!!clear_data_on_uninstall}
                  onChange={(e) =>
                    updateOption("clear_data_on_uninstall", e.target.checked)
                  }
                />
                <span className="label-text">
                  {__("Delete all museum data on uninstall")}
                </span>
              </label>
              <p className="help-text">
                {__(
                  "When checked, all museum objects, collections, and custom settings will be permanently deleted when the plugin is uninstalled.",
                )}
              </p>
            </div>

            <div className="option-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="show_post_status"
                  checked={!!show_post_status}
                  onChange={(e) =>
                    updateOption("show_post_status", e.target.checked)
                  }
                />
                <span className="label-text">
                  {__("Show post status in admin bar")}
                </span>
              </label>
              <p className="help-text">
                {__(
                  "Display the current post's publish status in the WordPress admin bar for easy reference.",
                )}
              </p>
            </div>

            <div className="option-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="collection_override_taxonomy"
                  checked={!!collection_override_taxonomy}
                  onChange={(e) =>
                    updateOption(
                      "collection_override_taxonomy",
                      e.target.checked,
                    )
                  }
                />
                <span className="label-text">
                  {__(
                    "Redirect collection taxonomy archive pages to collection posts",
                  )}
                </span>
              </label>
              <p className="help-text">
                {__(
                  "Automatically redirect visitors from collection taxonomy archive pages to the corresponding collection post pages.",
                )}
              </p>
            </div>
          </div>

          <div className="action-buttons">
            <Button isPrimary isLarge onClick={doSave}>
              Save Settings
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default GeneralOptions;
