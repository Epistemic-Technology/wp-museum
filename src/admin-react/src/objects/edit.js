import { useState, useEffect, useCallback, useRef } from "@wordpress/element";
import { Button, Spinner, Card, CardBody } from "@wordpress/components";
import apiFetch from "@wordpress/api-fetch";

import FieldEdit from "./field-edit";
import KindSettings from "./kind-settings";
import { useKindForm } from "./use-kind-form";
import { navigateToMain } from "../router";
import Breadcrumbs from "../components/breadcrumbs";

const Edit = (props) => {
  const { kindItem, kinds, updateKind, saveKindData } = props;

  const {
    kind_id: kindId,
    label: kindLabel,
    type_name: kindPostType,
  } = kindItem;

  const baseRestPath = "/wp-museum/v1";

  const dimensionsDefault = {
    n: 1,
    labels: ["", "", ""],
  };

  // Field data state (keeping existing field management for now)
  const [fieldData, setFieldData] = useState(null);
  const [nextFieldId, setNextFieldId] = useState(-1);
  const [fieldsSaveState, setFieldsSaveState] = useState({
    hasUnsavedChanges: false,
    isSaving: false,
    lastSaveTime: null,
    saveError: null,
  });

  // Drag and drop state
  const [draggedField, setDraggedField] = useState(null);
  const [dragOverField, setDragOverField] = useState(null);

  // Use custom hook for kind form management
  const kindForm = useKindForm(kindItem, async (formData) => {
    // Update the parent state with the form data
    // We need to simulate the event structure that updateKind expects
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== kindItem[key]) {
        const mockEvent = {
          target: {
            type: typeof formData[key] === "boolean" ? "checkbox" : "text",
            value: formData[key],
            checked: formData[key],
          },
        };
        updateKind(kindItem.kind_id, key, mockEvent);
      }
    });

    // Save to server
    await saveKindData();
  });

  const refreshFieldData = useCallback(() => {
    if (!kindPostType || kindPostType === "null") {
      return;
    }

    apiFetch({ path: `${baseRestPath}/${kindPostType}/fields` })
      .then((data) => {
        setFieldData(data);
        setFieldsSaveState((prev) => ({
          ...prev,
          hasUnsavedChanges: false,
          saveError: null,
        }));
      })
      .catch((error) => {
        console.error("Failed to load field data:", error);
        setFieldsSaveState((prev) => ({
          ...prev,
          saveError: "Failed to load field data.",
        }));
      });
  }, [kindPostType]);

  useEffect(() => {
    if (!fieldData) {
      refreshFieldData();
    }
  }, [fieldData, refreshFieldData]);

  const saveFieldData = useCallback(async () => {
    if (!fieldsSaveState.hasUnsavedChanges || !fieldData) return;

    setFieldsSaveState((prev) => ({
      ...prev,
      isSaving: true,
      saveError: null,
    }));

    try {
      await apiFetch({
        path: `${baseRestPath}/${kindPostType}/fields`,
        method: "POST",
        data: fieldData,
      });
      setFieldsSaveState((prev) => ({
        ...prev,
        hasUnsavedChanges: false,
        lastSaveTime: new Date(),
        isSaving: false,
      }));
    } catch (error) {
      console.error("Field save failed:", error);
      setFieldsSaveState((prev) => ({
        ...prev,
        saveError: "Field save failed. Please try again.",
        isSaving: false,
      }));
      throw error;
    }
  }, [fieldsSaveState.hasUnsavedChanges, fieldData, kindPostType]);

  const doManualSave = async () => {
    const promises = [];
    let hasError = false;

    try {
      // Save kind changes if any
      if (kindForm.isDirty) {
        promises.push(
          kindForm.save().catch((error) => {
            hasError = true;
            throw error;
          }),
        );
      }

      // Save field changes if any
      if (fieldsSaveState.hasUnsavedChanges) {
        promises.push(
          saveFieldData().catch((error) => {
            hasError = true;
            throw error;
          }),
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (error) {
      console.error("Manual save failed:", error);
      // Individual save functions handle their own error states
    }
  };

  const updateField = (fieldId, fieldItem, changeEventOrValue) => {
    // Handle both event objects and direct values for compatibility
    const newValue =
      changeEventOrValue && changeEventOrValue.target
        ? changeEventOrValue.target.type === "checkbox"
          ? changeEventOrValue.target.checked
          : changeEventOrValue.target.value
        : changeEventOrValue;

    // Handle dimensions separately
    if (fieldItem.startsWith("dimension")) {
      const newFieldData = Object.assign({}, fieldData);
      const [dimension, key, index] = fieldItem.split(".");
      const dimensionsField = fieldData[fieldId]["dimensions"];
      const newDimensionData = dimensionsField
        ? dimensionsField
        : dimensionsDefault;
      if (key == "n") {
        newDimensionData.n = newValue;
      } else {
        newDimensionData[key][index] = newValue;
      }
      newFieldData[fieldId]["dimensions"] = newDimensionData;
      setFieldData(newFieldData);
      setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));
      return;
    }

    // Update field data immediately
    const newFieldData = Object.assign({}, fieldData);
    if (fieldData[fieldId][fieldItem] !== newValue) {
      newFieldData[fieldId][fieldItem] = newValue;
      setFieldData(newFieldData);
      setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    }
  };

  const deleteField = async (fieldId) => {
    const newFieldData = Object.assign({}, fieldData);
    newFieldData[fieldId]["delete"] = true;
    setFieldData(newFieldData);

    try {
      await apiFetch({
        path: `${baseRestPath}/${kindPostType}/fields`,
        method: "POST",
        data: newFieldData,
      });
      refreshFieldData();
    } catch (error) {
      console.error("Failed to delete field:", error);
      setFieldsSaveState((prev) => ({
        ...prev,
        saveError: "Failed to delete field.",
      }));
    }
  };

  const updateFactors = (fieldId, newFactors) => {
    if (
      JSON.stringify(fieldData[fieldId]["factors"]) !==
      JSON.stringify(newFactors)
    ) {
      const newFieldData = Object.assign({}, fieldData);
      newFieldData[fieldId]["factors"] = newFactors;
      setFieldData(newFieldData);
      setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    }
  };

  const moveFieldToPosition = (sourceFieldId, targetFieldId) => {
    if (sourceFieldId === targetFieldId) return;

    const fieldValues = Object.values(fieldData);
    const sourceField = fieldValues.find((f) => f.field_id === sourceFieldId);
    const targetField = fieldValues.find((f) => f.field_id === targetFieldId);

    if (!sourceField || !targetField) return;

    const sortedFields = fieldValues.sort(
      (a, b) => a.display_order - b.display_order,
    );
    const sourceIndex = sortedFields.findIndex(
      (f) => f.field_id === sourceFieldId,
    );
    const targetIndex = sortedFields.findIndex(
      (f) => f.field_id === targetFieldId,
    );

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Remove source field and insert at target position
    const reorderedFields = [...sortedFields];
    const [movedField] = reorderedFields.splice(sourceIndex, 1);
    reorderedFields.splice(targetIndex, 0, movedField);

    // Update display_order for all fields
    const newFieldData = Object.assign({}, fieldData);
    reorderedFields.forEach((field, index) => {
      newFieldData[field.field_id].display_order = index;
    });

    setFieldData(newFieldData);
    setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));
  };

  const handleDragStart = (fieldId) => {
    setDraggedField(fieldId);
  };

  const handleDragOver = (e, fieldId) => {
    e.preventDefault();
    if (draggedField && draggedField !== fieldId) {
      setDragOverField(fieldId);
    }
  };

  const handleDragLeave = () => {
    setDragOverField(null);
  };

  const handleDrop = (e, targetFieldId) => {
    e.preventDefault();
    if (draggedField && targetFieldId && draggedField !== targetFieldId) {
      moveFieldToPosition(draggedField, targetFieldId);
    }
    setDraggedField(null);
    setDragOverField(null);
  };

  const handleDragEnd = () => {
    setDraggedField(null);
    setDragOverField(null);
  };

  const defaultFieldData = {
    field_id: 0,
    slug: "",
    kind_id: kindId,
    name: "",
    type: "plain",
    display_order: 0,
    public: true,
    required: false,
    quick_browse: false,
    help_text: "",
    detailed_instructions: "",
    public_description: "",
    field_schema: "",
    max_length: 0,
    dimensions: dimensionsDefault,
    factors: [],
    units: "",
  };

  const addField = async () => {
    const updatedFieldData = fieldData ? Object.assign({}, fieldData) : {};
    updatedFieldData[nextFieldId] = { ...defaultFieldData };
    updatedFieldData[nextFieldId]["field_id"] = nextFieldId;

    if (fieldData && Object.values(fieldData).length > 0) {
      const sortedFields = Object.values(fieldData).sort((a, b) =>
        a["display_order"] < b["display_order"] ? 1 : -1,
      );
      updatedFieldData[nextFieldId]["display_order"] =
        sortedFields[0]["display_order"] + 1;
    }

    setNextFieldId(nextFieldId - 1);
    setFieldData(updatedFieldData);
    setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));

    try {
      await apiFetch({
        path: `${baseRestPath}/${kindPostType}/fields`,
        method: "POST",
        data: updatedFieldData,
      });
      refreshFieldData();
    } catch (error) {
      console.error("Failed to add field:", error);
      setFieldsSaveState((prev) => ({
        ...prev,
        saveError: "Failed to add field.",
      }));
    }
  };

  const handleBackClick = () => {
    const hasChanges = kindForm.isDirty || fieldsSaveState.hasUnsavedChanges;
    if (hasChanges) {
      if (
        // TODO: Replace with accessible modal dialog
        confirm("You have unsaved changes. Are you sure you want to leave?")
      ) {
        navigateToMain();
      }
    } else {
      navigateToMain();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasChanges = kindForm.isDirty || fieldsSaveState.hasUnsavedChanges;
      if (hasChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [kindForm.isDirty, fieldsSaveState.hasUnsavedChanges]);

  const getSaveStatusText = () => {
    const isAnySaving = kindForm.isSaving || fieldsSaveState.isSaving;
    const hasAnyChanges = kindForm.isDirty || fieldsSaveState.hasUnsavedChanges;

    if (isAnySaving) return "Saving...";
    if (hasAnyChanges) return "Unsaved changes";

    // Show the most recent save time
    const lastSaveTimes = [
      kindForm.lastSaveTime,
      fieldsSaveState.lastSaveTime,
    ].filter(Boolean);
    if (lastSaveTimes.length > 0) {
      const mostRecent = new Date(
        Math.max(...lastSaveTimes.map((t) => t.getTime())),
      );
      return `Last saved: ${mostRecent.toLocaleTimeString()}`;
    }

    return "";
  };

  const getSaveStatusClass = () => {
    const isAnySaving = kindForm.isSaving || fieldsSaveState.isSaving;
    const hasAnyChanges = kindForm.isDirty || fieldsSaveState.hasUnsavedChanges;

    if (isAnySaving) return "is-saving";
    if (hasAnyChanges) return "unsaved-warning";
    if (kindForm.lastSaveTime || fieldsSaveState.lastSaveTime)
      return "saved-indicator";
    return "";
  };

  const hasAnyError = kindForm.saveError || fieldsSaveState.saveError;
  const isAnySaving = kindForm.isSaving || fieldsSaveState.isSaving;
  const hasAnyChanges = kindForm.isDirty || fieldsSaveState.hasUnsavedChanges;

  let fieldForms;
  if (fieldData) {
    fieldForms = Object.values(fieldData)
      .filter(
        (dataItem) => typeof dataItem.delete == "undefined" || !dataItem.delete,
      )
      .sort((a, b) => (a["display_order"] > b["display_order"] ? 1 : -1))
      .map((dataItem) => {
        const fieldId = dataItem["field_id"];
        const isDragging = draggedField === fieldId;
        const isDragOver = dragOverField === fieldId;

        return (
          <Card
            key={fieldId}
            className={`field-card ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, fieldId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, fieldId)}
          >
            <CardBody>
              <FieldEdit
                fieldData={dataItem}
                updateField={updateField}
                updateFactors={updateFactors}
                deleteField={deleteField}
                dimensionsDefault={dimensionsDefault}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: () => handleDragStart(fieldId),
                  onDragEnd: handleDragEnd,
                }}
              />
            </CardBody>
          </Card>
        );
      });
  }

  return (
    <div className="edit-container">
      <Breadcrumbs />

      <div className="edit-header">
        <Button onClick={handleBackClick} variant="secondary">
          ← Back to Objects
        </Button>

        <div className="header-title">
          <h1>
            {kindLabel}
            {hasAnyChanges && <span className="unsaved-indicator">*</span>}
          </h1>
        </div>

        <div className="header-actions">
          <div className={`save-status ${getSaveStatusClass()}`}>
            {isAnySaving && <Spinner />}
            <span>{getSaveStatusText()}</span>
          </div>

          {hasAnyError && (
            <div className="save-error">
              {kindForm.saveError || fieldsSaveState.saveError}
            </div>
          )}

          <Button
            onClick={doManualSave}
            variant="primary"
            isBusy={isAnySaving}
            disabled={isAnySaving || !hasAnyChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div className="edit-content">
        <div className="main-panel">
          <Card className="kind-settings-card">
            <CardBody>
              <h2>Object Settings</h2>
              <KindSettings
                kindData={kindForm.formData}
                fieldData={fieldData}
                kinds={kinds}
                onFieldChange={kindForm.handleInputChange}
                disabled={kindForm.isSaving}
              />
            </CardBody>
          </Card>

          <div className="fields-section">
            <div className="fields-header">
              <h2>Fields</h2>
              <Button
                onClick={addField}
                variant="secondary"
                disabled={isAnySaving}
              >
                Add New Field
              </Button>
            </div>

            <div className="fields-list">
              {fieldForms && fieldForms.length > 0 ? (
                fieldForms
              ) : (
                <Card className="empty-state">
                  <CardBody>
                    <p>
                      No fields configured yet. Add your first field to get
                      started.
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </div>

        <div className="help-panel">
          <Card>
            <CardBody>
              <h3>Field Types</h3>
              <ul>
                <li>
                  <strong>Plain Text:</strong> Simple text input
                </li>
                <li>
                  <strong>Rich Text:</strong> WYSIWYG editor
                </li>
                <li>
                  <strong>Date:</strong> Date picker
                </li>
                <li>
                  <strong>Measure:</strong> Numeric values with units
                </li>
                <li>
                  <strong>Factor:</strong> Single selection from predefined
                  options
                </li>
                <li>
                  <strong>Multiple Factor:</strong> Multiple selections
                </li>
                <li>
                  <strong>Flag:</strong> Yes/No checkbox
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Edit;
