import { useSelect, useDispatch } from "@wordpress/data";
import { useState, useEffect, useRef } from "@wordpress/element";
import apiFetch from "@wordpress/api-fetch";
import {
  InspectorControls,
  RichText,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  PanelBody,
  CheckboxControl,
  SelectControl,
} from "@wordpress/components";

import type { ChangeEvent, ReactNode } from "react";

import { stripslashes, isEmpty } from "../../javascript/util";
import LinksControl from "./links-control";

import type {
  MObjectField,
  ObjectFieldsResponse,
  MuseumObject,
} from "../../types";

interface ObjectMetaFieldProps {
  fieldData: MObjectField;
  fieldValue: any;
  errorText: ReactNode;
  onChange: (newValue: any) => void;
  onFocus: (helpText: string, detailedInstructions: string) => void;
  onBlur: (fieldData: MObjectField) => void;
}

const ObjectMetaField = (props: ObjectMetaFieldProps) => {
  const { fieldData, fieldValue, errorText, onChange, onFocus, onBlur } = props;

  const {
    help_text: helpText,
    type: fieldType,
    name: fieldName,
    public: isPublic,
    required,
    units,
  } = fieldData;

  // Placeholder
  const detailedInstructions = "Detailed instructions would be here.";

  const fieldLabel = fieldName + (required ? "*" : "");
  const fieldSlug = fieldName.toLowerCase().replace(/\s+/g, "-");

  const elementFocus = () => {
    onFocus(helpText, detailedInstructions);
  };

  const elementBlur = () => {
    onBlur(fieldData);
  };

  const onDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const onMeasureChange = (
    event: ChangeEvent<HTMLInputElement>,
    dimensionIndex: number,
  ) => {
    const newFieldValue = [...fieldValue];
    newFieldValue[dimensionIndex] = event.target.value;
    onChange(newFieldValue);
  };

  let factorOptions: { label: string; value: string }[] | undefined;
  if (fieldType === "factor" || fieldType === "multiple") {
    factorOptions = fieldData.factors.map((factor) => ({
      label: factor,
      value: factor,
    }));
  }

  let inputElement;
  if (fieldType == "flag") {
    inputElement = <CheckboxControl checked={fieldValue} onChange={onChange} />;
  } else if (fieldType == "rich") {
    inputElement = (
      <RichText
        // TODO(ts-migration): RichText's types don't declare a `name` prop,
        // but the prop was passed through at runtime before; spread-cast
        // keeps the identical runtime prop without a type error.
        {...({ name: fieldSlug } as any)}
        tagName="p"
        className="object-meta-long-text"
        value={fieldValue}
        onChange={onChange}
        preserveWhiteSpace
      />
    );
  } else if (fieldType == "plain") {
    inputElement = (
      <input
        name={fieldSlug}
        type="text"
        value={fieldValue}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  } else if (fieldType == "date") {
    inputElement = (
      <input
        name={fieldSlug}
        type="date"
        value={fieldValue}
        onChange={onDateChange}
      />
    );
  } else if (fieldType == "factor") {
    inputElement = (
      <SelectControl
        name={fieldSlug}
        onChange={onChange}
        value={fieldValue}
        options={factorOptions}
      />
    );
  } else if (fieldType == "multiple") {
    inputElement = (
      <SelectControl
        name={fieldSlug}
        multiple
        onChange={onChange}
        value={fieldValue || []}
        options={factorOptions}
      />
    );
  } else if (fieldType == "measure") {
    if (fieldData.dimensions.n == 1) {
      inputElement = (
        <input
          name={fieldSlug}
          type="number"
          value={fieldValue[0]}
          onChange={(event) => onMeasureChange(event, 0)}
        />
      );
    } else {
      const dimensionElements = fieldData.dimensions.labels.map(
        (dimensionLabel, index) => (
          <label key={index}>
            <div className="input-element-dimension-label">
              {dimensionLabel}
            </div>
            <input
              name={fieldSlug}
              type="number"
              value={fieldValue[index]}
              onChange={(event) => onMeasureChange(event, index)}
            />
          </label>
        ),
      );
      inputElement = (
        <div className="dimension-elements-input-wrapper">
          {dimensionElements}
        </div>
      );
    }
  } else if (fieldType == "links") {
    inputElement = <LinksControl value={fieldValue} onChange={onChange} />;
  } else {
    // TODO(ts-migration): `name` is not a valid <div> prop in React's types,
    // but it was passed through to the DOM attribute before; spread-cast
    // keeps the identical runtime prop.
    inputElement = <div {...({ name: fieldSlug } as any)}>{fieldValue}</div>;
  }

  const unitLabel = units && fieldType == "measure" ? ` (${units})` : "";

  return (
    <div className="object-meta-row">
      <div className="object-meta-info">
        <div className="object-meta-label">
          {fieldLabel}
          {unitLabel}
        </div>
        <div className="object-meta-private">{isPublic ? "" : "Private"}</div>
      </div>
      <div
        className={
          errorText ? "object-meta-input has-error" : "object-meta-input"
        }
        onFocus={elementFocus}
        onBlur={elementBlur}
      >
        {inputElement}
      </div>
      <div className="errorMessage">{errorText}</div>
    </div>
  );
};

interface ObjectMetaEditProps {
  attributes: Record<string, any>;
  setAttributes: (attributes: Record<string, any>) => void;
}

interface FieldInstructionsProps {
  helpText: string | null;
  detailedInstructions: string | null;
}

const ObjectMetaEdit = (props: ObjectMetaEditProps) => {
  const { attributes, setAttributes } = props;
  const blockProps = useBlockProps({ className: "object-meta-block" });

  const fieldsContainerRef = useRef<HTMLDivElement | null>(null);

  const [fieldData, setFieldData] = useState<ObjectFieldsResponse | null>(
    null,
  );
  const [postData, setPostData] = useState<MuseumObject | null>(null);
  const [currentHelpText, setCurrentHelpText] = useState<string | null>(null);
  const [currentDetailedInstructions, setCurrentDetailedInstructions] =
    useState<string | null>(null);
  const [catFieldIsGood, setCatFieldIsGood] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, ReactNode>>(
    {},
  );

  const { createErrorNotice } = useDispatch("core/notices");
  const { lockPostSaving, unlockPostSaving } = useDispatch("core/editor");

  const { postType, postId, isSavingPost, currentPostStatus } = useSelect(
    (select) => {
      // TODO(ts-migration): @wordpress/data's typed select() cannot resolve
      // the "core/editor" string key to its store selectors (types as never);
      // cast keeps the identical string-key lookup at runtime.
      const {
        getCurrentPostType,
        getCurrentPostId,
        isSavingPost,
        getEditedPostAttribute,
      } = select("core/editor") as any;
      return {
        postType: getCurrentPostType(),
        postId: getCurrentPostId(),
        isSavingPost: isSavingPost(),
        currentPostStatus: getEditedPostAttribute("status"),
      };
    },
    [],
  );

  const baseRestPath = "/wp-museum/v1";

  if (!fieldData) {
    apiFetch<ObjectFieldsResponse>({
      path: `${baseRestPath}/${postType}/fields`,
    }).then((result) => setFieldData(result));
  }

  if (!postData) {
    apiFetch<MuseumObject>({ path: `${baseRestPath}/all/${postId}` }).then(
      (result) => setPostData(result),
    );
  }

  const setFieldAttribute = (fieldSlug: string, newVal: any) => {
    let setObject: Record<string, any> = {};
    setObject[fieldSlug] = newVal;
    setAttributes(setObject);
  };

  const checkField = (fieldData: MObjectField) => {
    const {
      slug: fieldSlug,
      field_schema: fieldSchema,
      name: fieldName,
      required,
    } = fieldData;

    const updatedFieldErrors = Object.assign({}, fieldErrors);

    // clear existing errors
    updatedFieldErrors[fieldSlug] = null;

    const fieldValue = attributes[fieldSlug];

    if (required && !fieldValue) {
      updatedFieldErrors[fieldSlug] = <span>Field is required but empty.</span>;
    } else if (fieldSchema) {
      const pattern = "^" + stripslashes(fieldSchema) + "$";
      const regex = new RegExp(pattern);
      if (!regex.test(fieldValue)) {
        //updatedFieldErrors[ fieldSlug ] = ( <span>Value does not conform to schema.</span> );
      }
    }

    // Check to make sure catalogue ID field is unique.
    if (postData && fieldValue && postData.cat_field === fieldSlug) {
      if (catFieldIsGood) setCatFieldIsGood(false);
      apiFetch<MuseumObject[]>({
        path: `${baseRestPath}/all?${fieldSlug}=${fieldValue}`,
      }).then(
        (result) => {
          const updatedFieldErrors = Object.assign({}, fieldErrors);
          let foundError = false;
          if (Array.isArray(result) && result.length > 0) {
            result.map((objectData) => {
              if (objectData.ID != postId) {
                foundError = true;
                updatedFieldErrors[fieldSlug] = (
                  <span>
                    {`${fieldName} must be unique, but is already used by `}
                    <a href={objectData.edit_link}>{objectData.post_title}</a>.
                  </span>
                );
              }
            });
            if (foundError) {
              setFieldErrors(updatedFieldErrors);
            } else {
              if (!catFieldIsGood) setCatFieldIsGood(true);
            }
          }
        },
      );
    }
    setFieldErrors(updatedFieldErrors);
  };

  const checkAllFields = () => {
    Object.entries(fieldData).map((field) => {
      // TODO(ts-migration): pre-existing bug — Object.entries yields
      // [key, value] tuples, but checkField expects the field object itself,
      // so every destructured property (slug, field_schema, name, required)
      // is undefined here and the checks are no-ops. Cast preserves the
      // current behavior.
      checkField(field as unknown as MObjectField);
    });
  };

  useEffect(() => {
    if (!!fieldData && !isEmpty(fieldData)) {
      checkAllFields();
    }
  }, [fieldData]);

  // Override Gutenberg's Tab handling so keyboard navigation moves through
  // the object edit sequence — post title, description paragraph(s), then
  // each field — instead of jumping to the block toolbar or sidebar. The
  // listener is attached to the canvas document (which may be an iframe) in
  // the capture phase, with stopImmediatePropagation to prevent the block
  // editor's writing-flow listener from intercepting the event.
  useEffect(() => {
    const container = fieldsContainerRef.current;
    if (!container) return undefined;

    const doc = container.ownerDocument;

    const focusableSelector = [
      'input:not([disabled]):not([type="hidden"])',
      "select:not([disabled])",
      "textarea:not([disabled])",
      'button:not([disabled]):not([tabindex="-1"])',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const isVisible = (el: HTMLElement) =>
      el.offsetParent !== null || el.getClientRects().length;

    const getFocusSequence = () => {
      const sequence: HTMLElement[] = [];

      const title = doc.querySelector<HTMLElement>(
        ".editor-post-title__input",
      );
      if (title && isVisible(title)) sequence.push(title);

      // Paragraph blocks above the fields container (the object description).
      doc
        .querySelectorAll<HTMLElement>('[data-type="core/paragraph"]')
        .forEach((block) => {
          const editable = block.matches('[contenteditable="true"]')
            ? block
            : block.querySelector<HTMLElement>('[contenteditable="true"]');
          if (
            editable &&
            isVisible(editable) &&
            container.compareDocumentPosition(editable) &
              Node.DOCUMENT_POSITION_PRECEDING
          ) {
            sequence.push(editable);
          }
        });

      sequence.push(
        ...Array.from(
          container.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter(isVisible),
      );

      return sequence;
    };

    const moveCaretToEnd = (el: HTMLElement) => {
      if (!el.isContentEditable) return;
      const range = doc.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = doc.defaultView.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusables = getFocusSequence();
      if (focusables.length === 0) return;

      const currentIndex = focusables.indexOf(
        doc.activeElement as HTMLElement,
      );
      if (currentIndex === -1) return;

      const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;

      // At the boundaries, let the event propagate so focus can leave the
      // sequence normally.
      if (nextIndex < 0 || nextIndex >= focusables.length) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      focusables[nextIndex].focus();
      moveCaretToEnd(focusables[nextIndex]);
    };

    doc.addEventListener("keydown", handleKeyDown, true);
    return () => doc.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const onFieldFocus = (
    helpText: string | null,
    detailedInstructions: string | null,
  ) => {
    setCurrentHelpText(stripslashes(helpText));
    setCurrentDetailedInstructions(stripslashes(detailedInstructions));
  };

  const onFieldBlur = (fieldData: MObjectField) => {
    onFieldFocus(null, null);
    checkField(fieldData);
  };

  if (isSavingPost) {
    //checkAllFields();
  }

  const FieldInstructions = (props: FieldInstructionsProps) => {
    const { helpText, detailedInstructions } = props;

    return (
      <>
        {helpText || detailedInstructions ? (
          <InspectorControls>
            <PanelBody title="Help">{helpText || ""}</PanelBody>
            <PanelBody title="Detailed Instructions">
              {detailedInstructions || ""}
            </PanelBody>
          </InspectorControls>
        ) : null}
      </>
    );
  };

  let fields = null;
  if (fieldData) {
    fields = Object.entries(fieldData).map(([index, field]) => (
      <ObjectMetaField
        key={`object-meta-field-${index}`}
        fieldValue={attributes[field.slug]}
        fieldData={field}
        onChange={(val) => setFieldAttribute(field.slug, val)}
        onFocus={onFieldFocus}
        onBlur={onFieldBlur}
        errorText={
          fieldErrors && field.slug in fieldErrors && fieldErrors[field.slug]
        }
      />
    ));
  }

  return (
    <div {...blockProps}>
      <h3>Fields</h3>
      <FieldInstructions
        helpText={currentHelpText}
        detailedInstructions={currentDetailedInstructions}
      />
      <div className="object-meta-fields-container" ref={fieldsContainerRef}>
        {fields}
      </div>
    </div>
  );
};

export default ObjectMetaEdit;
