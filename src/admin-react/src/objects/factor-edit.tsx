import {
  Button,
  TextControl,
  Icon,
  Flex,
  FlexItem,
  FlexBlock,
  __experimentalVStack as VStack,
  __experimentalHStack as HStack,
} from "@wordpress/components";

import { useState, useRef, useEffect } from "@wordpress/element";

import { __ } from "@wordpress/i18n";

import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

/**
 * Close Icon
 */
const closeIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

/**
 * Plus Icon
 */
const plusIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

/**
 * Trash Icon
 */
const trashIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

interface FactorEditModalProps {
  /** Current factor options for the field. */
  factors?: string[];
  /** Replaces the field's factors with a new list. */
  updateFactors: (newFactors: string[]) => void;
  /** Closes the modal. */
  close: () => void;
  /** Whether the modal is currently open. */
  isOpen: boolean;
}

const FactorEditModal = (props: FactorEditModalProps) => {
  const { factors = [], updateFactors, close, isOpen } = props;

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const [currentInputText, setCurrentInputText] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      // Focus the input when modal opens
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 100);
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  const updateInputText = (value: string) => {
    setCurrentInputText(value);
  };

  const addFactor = () => {
    const trimmedText = currentInputText.trim();
    if (trimmedText && !factors.includes(trimmedText)) {
      const newFactors = [...factors, trimmedText];
      updateFactors(newFactors);
      setCurrentInputText("");
      // Refocus input after adding
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }
  };

  const removeFactor = (factorToRemove: string) => {
    const newFactors = factors.filter((factor) => factor !== factorToRemove);
    updateFactors(newFactors);
  };

  const clearAllFactors = () => {
    if (factors.length > 0) {
      updateFactors([]);
    }
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addFactor();
    }
  };

  const handleFactorKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    factor: string,
    index: number,
  ) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeFactor(factor);
      // Focus the next item or previous if last item
      const nextIndex =
        index < factors.length - 1 ? index : Math.max(0, index - 1);
      setFocusedIndex(nextIndex);
    } else if (event.key === "ArrowDown" && index < factors.length - 1) {
      event.preventDefault();
      setFocusedIndex(index + 1);
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      setFocusedIndex(index - 1);
    }
  };

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      close();
    }
  };

  const factorListItems = factors.map((factor, index) => (
    <div
      key={factor}
      className={`factor-list-item ${focusedIndex === index ? "focused" : ""}`}
      tabIndex={0}
      role="listitem"
      aria-label={__(
        `Factor: ${factor}. Press Delete or Backspace to remove.`,
        "wp-museum",
      )}
      onKeyDown={(event) => handleFactorKeyDown(event, factor, index)}
      onFocus={() => setFocusedIndex(index)}
      onBlur={() => setFocusedIndex(-1)}
    >
      <span className="factor-text">{factor}</span>
      <button
        type="button"
        className="remove-factor-btn"
        onClick={() => removeFactor(factor)}
        aria-label={__(`Remove factor: ${factor}`, "wp-museum")}
        title={__("Remove factor", "wp-museum")}
      >
        <Icon icon={closeIcon} size={16} />
      </button>
    </div>
  ));

  return (
    <dialog
      ref={dialogRef}
      className="factor-edit-modal"
      onClick={handleBackdropClick}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>{__("Edit Factors", "wp-museum")}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={close}
            aria-label={__("Close modal", "wp-museum")}
          >
            <Icon icon={closeIcon} size={20} />
          </button>
        </div>

        <div className="modal-body">
          <VStack spacing={6}>
            {/* Input Section */}
            <div className="factor-input-section">
              <HStack spacing={3}>
                <FlexBlock>
                  <TextControl
                    ref={textInputRef}
                    value={currentInputText}
                    onChange={updateInputText}
                    onKeyDown={handleInputKeyDown}
                    placeholder={__("Type to add a factor...", "wp-museum")}
                    className="factor-input"
                    autoComplete="off"
                  />
                </FlexBlock>
                <FlexItem>
                  <Button
                    variant="primary"
                    onClick={addFactor}
                    disabled={
                      !currentInputText.trim() ||
                      factors.includes(currentInputText.trim())
                    }
                    icon={plusIcon}
                    size="default"
                    className="add-factor-btn"
                  >
                    {__("Add", "wp-museum")}
                  </Button>
                </FlexItem>
              </HStack>
            </div>

            {/* Factors List */}
            <div className="factors-list-section">
              {factors.length > 0 ? (
                <>
                  <div className="factors-list-header">
                    <h3>{__("Current Factors", "wp-museum")}</h3>
                    <span className="factors-count">
                      {factors.length}{" "}
                      {factors.length === 1
                        ? __("factor", "wp-museum")
                        : __("factors", "wp-museum")}
                    </span>
                  </div>
                  <div
                    className="factors-list"
                    role="list"
                    aria-label={__("List of factors", "wp-museum")}
                  >
                    {factorListItems}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p>
                    {__(
                      "No factors added yet. Type above to add your first factor.",
                      "wp-museum",
                    )}
                  </p>
                </div>
              )}
            </div>
          </VStack>
        </div>

        {/* Action Buttons */}
        <div className="modal-footer">
          <HStack justify="space-between" className="modal-actions">
            <FlexItem>
              {factors.length > 0 && (
                <Button
                  variant="tertiary"
                  onClick={clearAllFactors}
                  icon={trashIcon}
                  isDestructive
                  className="clear-all-btn"
                >
                  {__("Clear All", "wp-museum")}
                </Button>
              )}
            </FlexItem>
            <FlexItem>
              <Button
                variant="primary"
                onClick={close}
                className="save-close-btn"
              >
                {__("Done", "wp-museum")}
              </Button>
            </FlexItem>
          </HStack>
        </div>
      </div>
    </dialog>
  );
};

export default FactorEditModal;
