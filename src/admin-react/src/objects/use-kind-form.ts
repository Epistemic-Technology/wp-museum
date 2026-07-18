import { useState, useCallback, useEffect } from "@wordpress/element";

import type { ChangeEvent } from "react";
import type { ObjectKind } from "../../../types";

/**
 * Change event accepted by the kind form's input handlers — the form mixes
 * text inputs, checkboxes, textareas, and selects.
 */
export type KindFormChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

export interface UseKindFormReturn {
  formData: Partial<ObjectKind>;
  isDirty: boolean;
  isSaving: boolean;
  lastSaveTime: Date | null;
  saveError: string | null;
  updateField: (fieldName: string, value: unknown) => void;
  handleInputChange: (
    fieldName: string,
  ) => (event: KindFormChangeEvent) => void;
  save: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export const useKindForm = (
  initialKindData: ObjectKind | null | undefined,
  onSave: (formData: Partial<ObjectKind>) => Promise<unknown> | unknown,
): UseKindFormReturn => {
  const [formData, setFormData] = useState<Partial<ObjectKind>>(
    initialKindData || {},
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update form data when initial data changes, but only if user isn't actively editing
  useEffect(() => {
    if (initialKindData && !isDirty) {
      setFormData(initialKindData);
      setIsDirty(false);
    }
  }, [initialKindData, isDirty]);

  const updateField = useCallback((fieldName: string, value: unknown) => {
    setFormData((prev) => {
      // Only update if the value actually changed
      if (prev[fieldName as keyof ObjectKind] === value) {
        return prev;
      }

      return {
        ...prev,
        [fieldName]: value,
      } as Partial<ObjectKind>;
    });
    setIsDirty(true);
  }, []);

  const handleInputChange = useCallback(
    (fieldName: string) => (event: KindFormChangeEvent) => {
      const target = event.target as HTMLInputElement;
      const value = target.type === "checkbox" ? target.checked : target.value;

      // Convert empty strings to null for consistency with existing behavior
      const processedValue = value === "" ? null : value;
      updateField(fieldName, processedValue);
    },
    [updateField],
  );

  const save = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(formData);
      setIsDirty(false);
      setLastSaveTime(new Date());
    } catch (error) {
      const errorMessage = (error as Error).message || "Save failed";
      setSaveError(errorMessage);
      console.error("Kind form save failed:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [formData, isDirty, isSaving, onSave]);

  const reset = useCallback(() => {
    setFormData(initialKindData || {});
    setIsDirty(false);
    setSaveError(null);
  }, [initialKindData]);

  const clearError = useCallback(() => {
    setSaveError(null);
  }, []);

  return {
    formData,
    isDirty,
    isSaving,
    lastSaveTime,
    saveError,
    updateField,
    handleInputChange,
    save,
    reset,
    clearError,
  };
};
