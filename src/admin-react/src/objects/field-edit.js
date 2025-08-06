import { useState } from "@wordpress/element";

import { Button, SVG, Path } from "@wordpress/components";

import FactorEditModal from "./factor-edit";

const trash = (
  <SVG
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
  >
    <Path d="M12 4h3c.6 0 1 .4 1 1v1H3V5c0-.6.5-1 1-1h3c.2-1.1 1.3-2 2.5-2s2.3.9 2.5 2zM8 4h3c-.2-.6-.9-1-1.5-1S8.2 3.4 8 4zM4 7h11l-.9 10.1c0 .5-.5.9-1 .9H5.9c-.5 0-.9-.4-1-.9L4 7z" />
  </SVG>
);

const chevronDown = (
  <SVG
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
  >
    <Path d="M17 9.4L12 14 7 9.4l-1 1.2 6 5.4 6-5.4z" />
  </SVG>
);

const chevronRight = (
  <SVG
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
  >
    <Path d="M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" />
  </SVG>
);

const dragHandle = (
  <SVG
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
  >
    <Path d="M8 7V5H6v2h2zm0 6V11H6v2h2zm0 6v-2H6v2h2zm6-16v2h2V3h-2zm0 6v2h2V9h-2zm0 6v2h2v-2h-2z" />
  </SVG>
);

const DimensionFields = ({ dimensionsData, fieldId, updateField }) => {
  if (dimensionsData.n <= 1) {
    return null;
  }

  const dimensionFields = [];
  for (let i = 0; i < dimensionsData.n; i++) {
    const inputId = `dimension-${fieldId}-${i}`;
    dimensionFields.push(
      <div className="dimension-field" key={`dimension-${i}`}>
        <label htmlFor={inputId}>Dimension {i + 1}</label>
        <input
          id={inputId}
          type="text"
          value={dimensionsData.labels[i] || ""}
          onChange={(event) =>
            updateField(fieldId, `dimension.labels.${i}`, event.target.value)
          }
          aria-describedby={`dimension-${fieldId}-${i}-desc`}
        />
        <div id={`dimension-${fieldId}-${i}-desc`} className="sr-only">
          Label for dimension {i + 1} of this measurement field
        </div>
      </div>,
    );
  }

  return (
    <div className="dimension-labels">
      <h4>Dimension Labels</h4>
      {dimensionFields}
    </div>
  );
};

const FieldTypeControls = ({
  fieldId,
  type,
  maxLength,
  factors,
  units,
  dimensionsData,
  updateField,
  updateFactors,
  newField,
}) => {
  const [factorModalOpen, setFactorModalOpen] = useState(false);

  if (newField) {
    return null;
  }

  return (
    <div className="field-type-controls">
      {(type === "plain" || type === "rich") && (
        <div className="field-section">
          <label htmlFor={`max-length-${fieldId}`}>Max Length</label>
          <input
            id={`max-length-${fieldId}`}
            type="number"
            value={maxLength || ""}
            onChange={(event) =>
              updateField(fieldId, "max_length", event.target.value)
            }
            aria-describedby={`max-length-${fieldId}-desc`}
          />
          <div id={`max-length-${fieldId}-desc`} className="sr-only">
            Maximum number of characters allowed in this field
          </div>
        </div>
      )}

      {(type === "factor" || type === "multiple") && (
        <div className="field-section factor-button">
          <Button
            className="field-edit-button button"
            onClick={() => setFactorModalOpen(true)}
            aria-describedby={`factors-${fieldId}-desc`}
          >
            Edit Factors
          </Button>
          <div id={`factors-${fieldId}-desc`} className="sr-only">
            Open modal to edit factor options for this field
          </div>
          <FactorEditModal
            factors={factors}
            updateFactors={(newFactors) => updateFactors(fieldId, newFactors)}
            close={() => setFactorModalOpen(false)}
            isOpen={factorModalOpen}
          />
        </div>
      )}

      {type === "measure" && (
        <>
          <div className="field-section">
            <label htmlFor={`dimensions-${fieldId}`}>Dimensions</label>
            <select
              id={`dimensions-${fieldId}`}
              value={dimensionsData.n}
              onChange={(event) =>
                updateField(fieldId, "dimension.n", event.target.value)
              }
              aria-describedby={`dimensions-${fieldId}-desc`}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
            <div id={`dimensions-${fieldId}-desc`} className="sr-only">
              Number of dimensions for this measurement (e.g., length, width,
              height)
            </div>
          </div>
          <div className="field-section units">
            <label htmlFor={`units-${fieldId}`}>Units</label>
            <input
              id={`units-${fieldId}`}
              type="text"
              value={units || ""}
              onChange={(event) =>
                updateField(fieldId, "units", event.target.value)
              }
              aria-describedby={`units-${fieldId}-desc`}
            />
            <div id={`units-${fieldId}-desc`} className="sr-only">
              Unit of measurement (e.g., cm, inches, kg)
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const FieldEdit = (props) => {
  const {
    fieldData,
    updateField,
    updateFactors,
    deleteField,
    dimensionsDefault,
    dragHandleProps,
  } = props;

  const {
    field_id: fieldId,
    name,
    type,
    display_order: displayOrder,
    public: isPublic,
    required,
    quick_browse: quickBrowse,
    help_text: helpText,
    detailed_instructions: detailedInstructions,
    public_description: publicDescription,
    field_schema: fieldSchema,
    max_length: maxLength,
    dimensions: dimensions,
    factors,
    units,
  } = fieldData;

  const newField = fieldId < 0;
  const [isExpanded, setIsExpanded] = useState(newField);
  const dimensionsData = dimensions ? dimensions : dimensionsDefault;

  const deleteThisField = () => {
    // TODO: Replace with a proper React confirmation modal for better UX and accessibility
    const confirmDelete = confirm(
      "Really delete field? This cannot be undone. Deleting field will not remove data from database, but it will be inaccessible unless a new field with the same name is created.",
    );
    if (confirmDelete) {
      deleteField(fieldId);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const selectOptions = [
    { value: "plain", label: "Plain Text" },
    { value: "rich", label: "Rich Text" },
    { value: "date", label: "Date" },
    { value: "measure", label: "Measure" },
    { value: "factor", label: "Factor" },
    { value: "multiple", label: "Multiple Factor" },
    { value: "flag", label: "Flag" },
  ];

  const getFieldTypeLabel = (type) => {
    const option = selectOptions.find((opt) => opt.value === type);
    return option ? option.label : type;
  };

  return (
    <div
      id={`field-accordion-${fieldId}`}
      className={`field-accordion ${isExpanded ? "expanded" : "collapsed"}`}
      role="region"
      aria-label={`Field editor for ${name || "new field"}`}
      data-testid={`field-accordion-${fieldId}`}
    >
      <div className="field-header" onClick={toggleExpanded}>
        <div className="field-header-left">
          <div
            className="drag-handle"
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
          >
            {dragHandle}
          </div>
          <button
            className="expand-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} field ${name || "unnamed"}`}
          >
            {isExpanded ? chevronDown : chevronRight}
          </button>
          <div className="field-summary">
            <span className="field-name">{name || "New Field"}</span>
            <span className="field-type-badge">
              {getFieldTypeLabel(type) || "Plain Text"}
            </span>
          </div>
        </div>
        <button
          className="delete-field-button"
          onClick={(e) => {
            e.stopPropagation();
            deleteThisField();
          }}
          aria-label={`Delete field ${name || "this field"}`}
        >
          {trash}
        </button>
      </div>

      {isExpanded && (
        <div className="field-content">
          <div className="field-section">
            <label htmlFor={`name-${fieldId}`}>Label</label>
            <input
              id={`name-${fieldId}`}
              type="text"
              value={name || ""}
              onChange={(event) =>
                updateField(fieldId, "name", event.target.value)
              }
              required
              aria-describedby={`name-${fieldId}-desc`}
            />
            <div id={`name-${fieldId}-desc`} className="sr-only">
              The display name for this field
            </div>
          </div>

          <div className="field-section">
            <label htmlFor={`type-${fieldId}`}>Type</label>
            <select
              id={`type-${fieldId}`}
              value={type || ""}
              onChange={(event) =>
                updateField(fieldId, "type", event.target.value)
              }
              required
              aria-describedby={`type-${fieldId}-desc`}
            >
              {selectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div id={`type-${fieldId}-desc`} className="sr-only">
              The data type for this field
            </div>
          </div>

          <FieldTypeControls
            fieldId={fieldId}
            type={type}
            maxLength={maxLength}
            factors={factors}
            units={units}
            dimensionsData={dimensionsData}
            updateField={updateField}
            updateFactors={updateFactors}
            newField={newField}
          />

          {!newField && type === "measure" && dimensionsData.n > 1 && (
            <DimensionFields
              dimensionsData={dimensionsData}
              fieldId={fieldId}
              updateField={updateField}
            />
          )}

          <div className="field-section">
            <label htmlFor={`field-schema-${fieldId}`}>Field Schema</label>
            <input
              id={`field-schema-${fieldId}`}
              type="text"
              value={fieldSchema || ""}
              onChange={(event) =>
                updateField(fieldId, "field_schema", event.target.value)
              }
              aria-describedby={`field-schema-${fieldId}-desc`}
            />
            <div id={`field-schema-${fieldId}-desc`} className="sr-only">
              Technical schema identifier for this field
            </div>
          </div>

          <div className="field-section">
            <label htmlFor={`help-text-${fieldId}`}>Help Text</label>
            <input
              id={`help-text-${fieldId}`}
              type="text"
              value={helpText || ""}
              onChange={(event) =>
                updateField(fieldId, "help_text", event.target.value)
              }
              aria-describedby={`help-text-${fieldId}-desc`}
            />
            <div id={`help-text-${fieldId}-desc`} className="sr-only">
              Short help text shown to users when filling out this field
            </div>
          </div>

          <div className="field-section">
            <label htmlFor={`detailed-instructions-${fieldId}`}>
              Detailed Instructions
            </label>
            <textarea
              id={`detailed-instructions-${fieldId}`}
              value={detailedInstructions || ""}
              onChange={(event) =>
                updateField(
                  fieldId,
                  "detailed_instructions",
                  event.target.value,
                )
              }
              rows="3"
              aria-describedby={`detailed-instructions-${fieldId}-desc`}
            />
            <div
              id={`detailed-instructions-${fieldId}-desc`}
              className="sr-only"
            >
              Detailed instructions for users on how to complete this field
            </div>
          </div>

          <div className="field-section">
            <label htmlFor={`public-description-${fieldId}`}>
              Public Description
            </label>
            <textarea
              id={`public-description-${fieldId}`}
              value={publicDescription || ""}
              onChange={(event) =>
                updateField(fieldId, "public_description", event.target.value)
              }
              rows="3"
              aria-describedby={`public-description-${fieldId}-desc`}
            />
            <div id={`public-description-${fieldId}-desc`} className="sr-only">
              Description shown to public users viewing this field's data
            </div>
          </div>

          <div className="field-checkboxes">
            <div className="checkbox-group">
              <input
                id={`public-${fieldId}`}
                type="checkbox"
                checked={isPublic || false}
                onChange={(event) =>
                  updateField(fieldId, "public", event.target.checked)
                }
                aria-describedby={`public-${fieldId}-desc`}
              />
              <label htmlFor={`public-${fieldId}`}>Public</label>
              <div id={`public-${fieldId}-desc`} className="sr-only">
                Make this field visible to public users
              </div>
            </div>

            <div className="checkbox-group">
              <input
                id={`required-${fieldId}`}
                type="checkbox"
                checked={required || false}
                onChange={(event) =>
                  updateField(fieldId, "required", event.target.checked)
                }
                aria-describedby={`required-${fieldId}-desc`}
              />
              <label htmlFor={`required-${fieldId}`}>Required</label>
              <div id={`required-${fieldId}-desc`} className="sr-only">
                Make this field required when creating new objects
              </div>
            </div>

            <div className="checkbox-group">
              <input
                id={`quick-browse-${fieldId}`}
                type="checkbox"
                checked={quickBrowse || false}
                onChange={(event) =>
                  updateField(fieldId, "quick_browse", event.target.checked)
                }
                aria-describedby={`quick-browse-${fieldId}-desc`}
              />
              <label htmlFor={`quick-browse-${fieldId}`}>Quick Browse</label>
              <div id={`quick-browse-${fieldId}-desc`} className="sr-only">
                Show this field in quick browse listings
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldEdit;
