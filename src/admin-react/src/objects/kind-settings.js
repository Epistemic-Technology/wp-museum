import { memo } from "@wordpress/element";

const KindSettings = memo(
  ({ kindData, fieldData, kinds, onFieldChange, disabled = false }) => {
    const {
      kind_id: kindId,
      cat_field_id: catFieldId,
      description,
      categorized,
      exclude_from_search: excludeFromSearch,
      label,
      label_plural: labelPlural,
      must_featured_image: mustFeaturedImage,
      must_gallery: mustGallery,
      parent_kind_id: parentKindId,
      strict_checking: strictChecking,
      cat_id_auto_generate: catIdAutoGenerate,
      cat_id_prefix: catIdPrefix,
      cat_id_pad_length: catIdPadLength,
    } = kindData;

    const parentKindOptions =
      kinds
        ?.filter((kindItem) => kindItem.kind_id !== kindId)
        .map((kindItem) => (
          <option key={kindItem.kind_id} value={kindItem.kind_id}>
            {kindItem.label}
          </option>
        )) || [];

    const idFieldOptions = fieldData
      ? Object.values(fieldData).map((fieldItem) => (
          <option key={fieldItem.field_id} value={fieldItem.field_id}>
            {fieldItem.name}
          </option>
        ))
      : [];

    return (
      <div className="edit-kind-form">
        <label className="kind-label-field">
          Object Name
          <input
            type="text"
            name="kind-label"
            className="kind-label-input"
            value={label || ""}
            onChange={onFieldChange("label")}
            disabled={disabled}
          />
        </label>

        <label className="kind-label-plural-field">
          Object Name (Plural)
          <input
            type="text"
            name="kind-label-plural"
            className="kind-label-plural-input"
            value={labelPlural || ""}
            onChange={onFieldChange("label_plural")}
            disabled={disabled}
          />
        </label>

        <label className="kind-description-field">
          Description
          <textarea
            name="kind-description"
            className="kind-description-textarea"
            value={description || ""}
            onChange={onFieldChange("description")}
            disabled={disabled}
          />
        </label>

        <label className="kind-parent-field">
          Parent Object
          <select
            name="kind-parent"
            className="kind-parent-select"
            value={parentKindId || ""}
            onChange={onFieldChange("parent_kind_id")}
            disabled={disabled}
          >
            <option value="">None</option>
            {parentKindOptions}
          </select>
        </label>

        <label className="kind-id-field">
          ID Field
          <select
            name="kind-id-field"
            className="kind-id-field-select"
            value={catFieldId || ""}
            onChange={onFieldChange("cat_field_id")}
            disabled={disabled}
          >
            <option value="">None</option>
            {idFieldOptions}
          </select>
        </label>

        {catFieldId ? (
          <div className="kind-cat-id-auto">
            <label className="kind-cat-id-auto-generate-field">
              <input
                type="checkbox"
                name="kind-cat-id-auto-generate"
                className="kind-cat-id-auto-generate-checkbox"
                checked={!!catIdAutoGenerate}
                onChange={onFieldChange("cat_id_auto_generate")}
                disabled={disabled}
              />
              Auto-generate ID when empty
            </label>
            {catIdAutoGenerate ? (
              <div className="kind-cat-id-auto-options">
                <label className="kind-cat-id-prefix-field">
                  Prefix
                  <input
                    type="text"
                    name="kind-cat-id-prefix"
                    className="kind-cat-id-prefix-input"
                    value={catIdPrefix || ""}
                    onChange={onFieldChange("cat_id_prefix")}
                    placeholder="e.g. OBJ-"
                    disabled={disabled}
                  />
                </label>
                <label className="kind-cat-id-pad-length-field">
                  Pad to digits
                  <input
                    type="number"
                    min="0"
                    name="kind-cat-id-pad-length"
                    className="kind-cat-id-pad-length-input"
                    value={catIdPadLength ?? 0}
                    onChange={onFieldChange("cat_id_pad_length")}
                    disabled={disabled}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="kind-options">
          <label className="kind-strict-checking-field">
            <input
              type="checkbox"
              name="kind-strict-checking"
              className="kind-strict-checking-checkbox"
              checked={!!strictChecking}
              onChange={onFieldChange("strict_checking")}
              disabled={disabled}
            />
            Strictly enforce requirements
          </label>

          <label className="kind-categorized-field">
            <input
              type="checkbox"
              name="kind-categorized"
              className="kind-categorized-checkbox"
              checked={!!categorized}
              onChange={onFieldChange("categorized")}
              disabled={disabled}
            />
            Must be categorized
          </label>

          <label className="kind-must-featured-image-field">
            <input
              type="checkbox"
              name="kind-must-featured-image"
              className="kind-must-featured-image-checkbox"
              checked={!!mustFeaturedImage}
              onChange={onFieldChange("must_featured_image")}
              disabled={disabled}
            />
            Must have featured image
          </label>

          <label className="kind-must-gallery-field">
            <input
              type="checkbox"
              name="kind-must-gallery"
              className="kind-must-gallery-checkbox"
              checked={!!mustGallery}
              onChange={onFieldChange("must_gallery")}
              disabled={disabled}
            />
            Must have image gallery
          </label>

          <label className="kind-exclude-from-search-field">
            <input
              type="checkbox"
              name="kind-exclude-from-search"
              className="kind-exclude-from-search-checkbox"
              checked={!!excludeFromSearch}
              onChange={onFieldChange("exclude_from_search")}
              disabled={disabled}
            />
            Exclude from search
          </label>
        </div>
      </div>
    );
  },
);

export default KindSettings;
