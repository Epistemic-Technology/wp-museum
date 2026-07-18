import { useState, useEffect, useCallback, useRef } from "@wordpress/element";
import {
  Button,
  Spinner,
  Card,
  CardBody,
  Panel,
  PanelBody,
} from "@wordpress/components";
import apiFetch from "@wordpress/api-fetch";

import type { DragEvent, ReactElement } from "react";
import type { MObjectField, FieldDimensions, ObjectKind } from "../../../types";

import FieldEdit from "./field-edit";
import KindSettings from "./kind-settings";
import { useKindForm } from "./use-kind-form";
import { navigateToMain } from "../router";

const HELP_PANEL_STORAGE_KEY = "wpm-field-types-help-open";

// TODO(ts-migration): see comment at the usage site — memo() from
// @wordpress/element loses KindSettings' props type.
const KindSettingsCompat = KindSettings as any;

/**
 * A field as held in local editor state: the wire shape plus the
 * client-side `delete` marker sent back to the fields endpoint.
 */
type EditableField = MObjectField & { delete?: boolean };

type FieldDataMap = Record<string, EditableField>;

interface FieldsSaveState {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSaveTime: Date | null;
  saveError: string | null;
}

interface EditProps {
  kindItem: ObjectKind;
  kinds: ObjectKind[];
  updateKind: (
    kindId: number | null,
    field: string,
    event: { target: { type: string; value: any; checked: any } },
  ) => void;
  saveKindData: () => Promise<void> | void;
}

const Edit = (props: EditProps) => {
  const { kindItem, kinds, updateKind, saveKindData } = props;

  const {
    kind_id: kindId,
    label: kindLabel,
    type_name: kindPostType,
  } = kindItem;

  const baseRestPath = "/wp-museum/v1";

  const dimensionsDefault: FieldDimensions = {
    n: 1,
    labels: ["", "", ""],
  };

  // Field data state (keeping existing field management for now)
  const [fieldData, setFieldData] = useState<FieldDataMap | null>(null);
  const [nextFieldId, setNextFieldId] = useState(-1);
  const [fieldsSaveState, setFieldsSaveState] = useState<FieldsSaveState>({
    hasUnsavedChanges: false,
    isSaving: false,
    lastSaveTime: null,
    saveError: null,
  });

  // Drag and drop state
  const [draggedField, setDraggedField] = useState<number | null>(null);
  const [dragOverField, setDragOverField] = useState<number | null>(null);

  // Field Types help panel collapse state, persisted across page loads
  const [helpPanelOpen, setHelpPanelOpen] = useState(
    () => window.localStorage.getItem(HELP_PANEL_STORAGE_KEY) !== "closed",
  );

  const toggleHelpPanel = () => {
    const nextOpen = !helpPanelOpen;
    setHelpPanelOpen(nextOpen);
    window.localStorage.setItem(
      HELP_PANEL_STORAGE_KEY,
      nextOpen ? "open" : "closed",
    );
  };

  // Use custom hook for kind form management
  const kindForm = useKindForm(kindItem, async (formData: Partial<ObjectKind>) => {
    // Update the parent state with the form data
    // We need to simulate the event structure that updateKind expects
    Object.keys(formData).forEach((key) => {
      const kindKey = key as keyof ObjectKind;
      if (formData[kindKey] !== kindItem[kindKey]) {
        const mockEvent = {
          target: {
            type: typeof formData[kindKey] === "boolean" ? "checkbox" : "text",
            value: formData[kindKey],
            checked: formData[kindKey],
          },
        };
        updateKind(kindItem.kind_id, key, mockEvent);
      }
    });

    // Save to server
    await saveKindData();
  });

  const refreshFieldData = useCallback(() => {
    // TODO(ts-migration): pre-existing bug — comparing against the string
    // literal "null", but the wire value of type_name is string | JSON null,
    // never the string "null". Preserved as-is (no behavior change).
    if (!kindPostType || kindPostType === "null") {
      return;
    }

    apiFetch<FieldDataMap>({ path: `${baseRestPath}/${kindPostType}/fields` })
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

  const updateField = (
    fieldId: number,
    fieldItem: string,
    changeEventOrValue: any,
  ) => {
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
      // TODO(strict): possible null at runtime if called before fields load
      const dimensionsField = fieldData![fieldId]["dimensions"];
      const newDimensionData = dimensionsField
        ? dimensionsField
        : dimensionsDefault;
      if (key == "n") {
        newDimensionData.n = newValue;
      } else {
        (newDimensionData as unknown as Record<string, Record<string, unknown>>)[
          key
        ][index] = newValue;
      }
      newFieldData[fieldId]["dimensions"] = newDimensionData;
      setFieldData(newFieldData);
      setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));
      return;
    }

    // Update field data immediately
    const newFieldData = Object.assign({}, fieldData);
    // TODO(strict): possible null at runtime if called before fields load
    if (
      (fieldData![fieldId] as unknown as Record<string, unknown>)[
        fieldItem
      ] !== newValue
    ) {
      (newFieldData[fieldId] as unknown as Record<string, unknown>)[
        fieldItem
      ] = newValue;
      setFieldData(newFieldData);
      setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    }
  };

  const deleteField = async (fieldId: number) => {
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

  const updateFactors = (fieldId: number, newFactors: string[]) => {
    if (
      // TODO(strict): possible null at runtime if called before fields load
      JSON.stringify(fieldData![fieldId]["factors"]) !==
      JSON.stringify(newFactors)
    ) {
      const newFieldData = Object.assign({}, fieldData);
      newFieldData[fieldId]["factors"] = newFactors;
      setFieldData(newFieldData);
      setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    }
  };

  const moveFieldToPosition = (
    sourceFieldId: number,
    targetFieldId: number,
  ) => {
    if (sourceFieldId === targetFieldId) return;

    // TODO(strict): possible null at runtime if called before fields load
    const fieldValues = Object.values(fieldData!);
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

  const handleDragStart = (fieldId: number) => {
    setDraggedField(fieldId);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, fieldId: number) => {
    e.preventDefault();
    if (draggedField && draggedField !== fieldId) {
      setDragOverField(fieldId);
    }
  };

  const handleDragLeave = () => {
    setDragOverField(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetFieldId: number) => {
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

  const defaultFieldData: EditableField = {
    field_id: 0,
    slug: "",
    // TODO(strict): possible null at runtime — wire kind_id is number | null
    kind_id: kindId as number,
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

    const newFieldDomId = `field-accordion-${nextFieldId}`;

    setNextFieldId(nextFieldId - 1);
    setFieldData(updatedFieldData);
    setFieldsSaveState((prev) => ({ ...prev, hasUnsavedChanges: true }));

    // Scroll the newly inserted field into view and flash a highlight so
    // it's obvious something happened even when the row lands below the
    // fold (#122). RAF waits for React to commit the new row before we
    // query the DOM.
    requestAnimationFrame(() => {
      const element = document.getElementById(newFieldDomId);
      if (!element) return;
      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      )?.matches;
      element.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      element.classList.add("field-accordion--just-added");
      setTimeout(() => {
        element.classList.remove("field-accordion--just-added");
      }, 1600);
    });

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
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
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
    ].filter(Boolean) as Date[];
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

  let fieldForms: ReactElement[] | undefined;
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
              {/* TODO(ts-migration): @wordpress/element's memo() typing
                  erases KindSettings' props interface (it resolves to
                  `object`), rejecting these currently-working props — cast
                  the component rather than changing behavior. */}
              <KindSettingsCompat
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
          <Panel>
            <PanelBody
              title="Field Types"
              opened={helpPanelOpen}
              onToggle={toggleHelpPanel}
            >
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
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default Edit;
