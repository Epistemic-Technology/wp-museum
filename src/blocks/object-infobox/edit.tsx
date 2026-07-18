/**
 * Gutenberg editor view for Object Infobox block. Creates <ObjectInfoEdit> component.
 */

/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

import { PanelBody, CheckboxControl } from "@wordpress/components";

import { useCallback, useEffect, useState } from "@wordpress/element";

import { __ } from "@wordpress/i18n";

import apiFetch from "@wordpress/api-fetch";

/**
 * Internal dependencies
 */
import {
  ObjectEmbedPanel,
  ImageSizePanel,
  FontSizePanel,
} from "../../components";

import InfoContent from "./info-content";

import type {
  MuseumObject,
  MuseumObjectFieldValue,
  MObjectField,
  ObjectFieldsResponse,
} from "../../types";

import type { ImageDimensions } from "../../components/image-size-panel/image-size-panel";

// TODO(ts-migration): ObjectEmbedPanel's props type requires initialOpen, but
// this block has never passed it (so it is undefined at runtime). Cast to keep
// the currently-working call site unchanged.
const ObjectEmbedPanelCompat = ObjectEmbedPanel as any;

/**
 * Per-field display data stored in the fieldData attribute: the field's
 * display name and its (formatted) value for the embedded object.
 */
export interface InfoboxFieldData {
  name: string;
  content: MuseumObjectFieldValue | string;
}

/**
 * Attributes of the Object Infobox block.
 *
 * @see ./block.json
 */
export interface ObjectInfoboxAttributes {
  align: string;
  objectID: number;
  catID: string;
  title: string;
  excerpt: string;
  imgURL: string | null;
  imgIndex: number;
  totalImages: number;
  imgHeight: number;
  imgWidth: number;
  objectURL: string;
  displayTitle: boolean;
  displayExcerpt: boolean;
  displayImage: boolean;
  linkToObject: boolean;
  /** Map of field_id => whether the field is selected for display. */
  fields: Record<string, boolean>;
  /** Map of field_id => display data for the field. */
  fieldData: Record<string, InfoboxFieldData>;
  imgDimensions: ImageDimensions;
  imgAlignment: string;
  fontSize: number;
  titleTag: string;
}

export type SetInfoboxAttributes = (
  attributes: Partial<ObjectInfoboxAttributes>
) => void;

interface ObjectInfoEditProps {
  attributes: ObjectInfoboxAttributes;
  setAttributes: SetInfoboxAttributes;
}

interface FieldsPanelProps {
  setAttributes: SetInfoboxAttributes;
  fields: Record<string, boolean>;
  fieldData: Record<string, InfoboxFieldData>;
}

/**
 * Result of processFieldData; empty object when data is unavailable.
 */
interface ProcessedFieldData {
  newFields?: Record<string, boolean>;
  fieldData?: Record<string, InfoboxFieldData>;
}

/**
 * Inspector panel for selecting which fields to display in the infobox.
 *
 * @param {object}   props               The component's properties.
 * @param {function} props.setAttributes Callback function to set block
 *                                       attributes.
 * @param {object}   props.fields        List of object fields and whether they
 *                                       are selected for display.
 * @param {object}   props.fieldData     Data for each field.
 */
const FieldsPanel = (props: FieldsPanelProps) => {
  const { setAttributes, fields, fieldData } = props;

  /**
   * Callback to update whether a field is selected.
   *
   * @param {number}  key Array index of the field.
   * @param {boolean} val Whether the field is selected.
   */
  const updateField = (key: string, val: boolean) => {
    const newFields = Object.assign({}, fields);
    newFields[key] = val;

    setAttributes({
      fields: newFields,
    });
  };

  if (
    Object.keys(fields).length > 0 &&
    Object.keys(fieldData).length === Object.keys(fields).length
  ) {
    const items = Object.keys(fields).map((key) => (
      <CheckboxControl
        key={key.toString()}
        label={fieldData[key]["name"]}
        checked={fields[key]}
        onChange={(val) => {
          updateField(key, val);
        }}
      />
    ));
    return (
      <PanelBody title="Custom Fields" initialOpen={true}>
        {items}
      </PanelBody>
    );
  } else {
    return null;
  }
};

/**
 * Inspector panel controlling whether to display title, caption for the block
 * and whether clicking on images will link to the associated object.
 *
 * @param {object}   props                           The component's properties.
 * @param {object}   props.attributes                The block's attributes.
 * @param {function} props.setAttributes             Callback function to update block attributes.
 * @param {boolean}  props.attributes.displayTitle   Whether to display a title for the block.
 * @param {boolean}  props.attributes.displayExcerpt Whether to display object description.
 * @param {boolean}  props.attributes.displayImage   Whether to display image for the block.
 * @param {boolean}  props.attributes.linkToObject   Whether block should link to objects.
 */
const OptionsPanel = (props: ObjectInfoEditProps) => {
  const { attributes, setAttributes } = props;
  const { displayTitle, displayExcerpt, displayImage, linkToObject } =
    attributes;
  return (
    <PanelBody title="Options" initialOpen={true}>
      <CheckboxControl
        label="Display Title"
        checked={displayTitle}
        onChange={(val) => {
          setAttributes({ displayTitle: val });
        }}
      />
      <CheckboxControl
        label="Display Excerpt"
        checked={displayExcerpt}
        onChange={(val) => {
          setAttributes({ displayExcerpt: val });
        }}
      />
      <CheckboxControl
        label="Display Image"
        checked={displayImage}
        onChange={(val) => {
          setAttributes({ displayImage: val });
        }}
      />
      <CheckboxControl
        label="Link to Object"
        checked={linkToObject}
        onChange={(val) => {
          setAttributes({ linkToObject: val });
        }}
      />
    </PanelBody>
  );
};

/**
 * Main editor component for Object Infobox block.
 *
 * All of the content of this block is fetched from the REST api. The user
 * controls which information is displayed through the InspectorControl.
 */
const ObjectInfoEdit = (props: ObjectInfoEditProps) => {
  const [objectData, setObjectData] = useState<Partial<MuseumObject>>({});
  const [error, setError] = useState<string | null>(null);
  const { setAttributes, attributes } = props;

  /**
   * Fetches base object data from WordPress REST API
   *
   * @param {number} objectID WordPress post_id of object
   * @returns {Promise<object>} Object data
   */
  const fetchObjectData = useCallback(
    async (objectID: number): Promise<MuseumObject | null> => {
      if (!objectID) return null;

      const base_rest_path = "/wp-museum/v1/";
      const object_path = base_rest_path + "all/" + objectID;

      try {
        const result = await apiFetch<MuseumObject>({ path: object_path });
        return result;
      } catch (err) {
        setError(`Error fetching object data: ${err.message}`);
        return null;
      }
    },
    []
  );

  /**
   * Processes object field data and updates component state
   *
   * @param {object} objectData The object data
   * @param {object} fieldsMetadata Metadata about object fields
   * @param {object} currentFields Current field selections
   * @returns {object} Processed field data
   */
  const processFieldData = useCallback(
    (
      objectData: MuseumObject,
      fieldsMetadata: Record<string, MObjectField>,
      currentFields: Record<string, boolean>
    ): ProcessedFieldData => {
      if (!objectData || !fieldsMetadata) return {};

      let newFields: Record<string, boolean> = {};
      let fieldData: Record<string, InfoboxFieldData> = {};

      for (let key in fieldsMetadata) {
        // Preserve current field selections or default to false
        newFields[key] =
          typeof currentFields[key] === "undefined"
            ? false
            : currentFields[key];

        // Format content based on field type
        let content: MuseumObjectFieldValue = "";
        // TODO(ts-migration): 'tinyint' is not a real field type (the boolean
        // type is 'flag') and flag values arrive as JSON booleans, not 1, so
        // this branch never matches. Preserved as-is; the cast keeps the
        // no-overlap comparison compiling.
        if ((fieldsMetadata[key]["type"] as string) === "tinyint") {
          content =
            objectData[fieldsMetadata[key]["slug"]] === 1 ? "Yes" : "No";
        } else {
          content = objectData[
            fieldsMetadata[key]["slug"]
          ] as MuseumObjectFieldValue;
        }

        fieldData[key] = {
          name: fieldsMetadata[key]["name"],
          content: content,
        };
      }

      return { newFields, fieldData };
    },
    []
  );

  /**
   * Fetches object data from WordPress REST api.
   *
   * If objectFetchID is set, then fetch that object. Otherwise use the
   * objectID set in the block attributes. This function takes an
   * objectFetchID so that you don't need to wait for setAttributes to fire
   * before fetching data from the API, which would introduce additional
   * update lag.
   *
   * @param {number} objectFetchID WordPress post_id of object.
   */
  const fetchFieldData = useCallback(
    async (objectFetchID: number | null = null) => {
      setError(null);

      try {
        const objectID = objectFetchID ? objectFetchID : attributes.objectID;
        if (!objectID) {
          return;
        }

        // Fetch main object data
        const result = await fetchObjectData(objectID);
        if (!result) {
          return;
        }

        // Update object data state
        setObjectData(result);

        // Update basic attributes
        setAttributes({
          title: result["post_title"],
          excerpt: result["excerpt"],
          objectURL: result["link"],
        });

        // Fetch field metadata
        const base_rest_path = "/wp-museum/v1/";
        const fieldsMetadata = await apiFetch<ObjectFieldsResponse>({
          path: base_rest_path + result.post_type + "/fields",
        });

        // Process field data
        const { newFields, fieldData } = processFieldData(
          result,
          fieldsMetadata as Record<string, MObjectField>,
          attributes.fields
        );

        // Update fields-related attributes
        setAttributes({
          catID: result[result["cat_field"] as string] as string,
          fields: newFields,
          fieldData: fieldData,
        });
      } catch (err) {
        setError(`Error loading data: ${err.message}`);
      }
    },
    [
      attributes.objectID,
      attributes.fields,
      fetchObjectData,
      processFieldData,
      setAttributes,
    ]
  );

  /**
   * When component mounts, fetch object data from the REST API.
   */
  useEffect(() => {
    fetchFieldData();
  }, [fetchFieldData]);

  /**
   * Callback function for search modal. When an object is found, set the
   * objectID attribute and fetch the data for that object from the REST API.
   *
   * @param {number} returnValue WordPress post_of found object.
   */
  const onSearchModalReturn = useCallback(
    (returnValue: number | null) => {
      if (returnValue != null) {
        setAttributes({ objectID: returnValue });
        fetchFieldData(returnValue);
      }
    },
    [setAttributes, fetchFieldData]
  );

  const {
    fontSize,
    titleTag,
    title,
    catID,
    objectID,
    fields,
    fieldData,
    objectURL,
    imgDimensions,
    imgAlignment,
    displayTitle,
    displayExcerpt,
    excerpt,
    imgURL,
    displayImage,
    linkToObject,
    totalImages,
    imgHeight,
    imgWidth,
    imgIndex,
  } = attributes;

  const blockProps = useBlockProps();

  return (
    <div {...blockProps}>
      <InspectorControls>
        <ObjectEmbedPanelCompat
          onSearchModalReturn={onSearchModalReturn}
          title={title}
          catID={catID}
          objectID={objectID}
          objectURL={objectURL}
        />
        <OptionsPanel {...props} />
        <ImageSizePanel
          setAttributes={setAttributes}
          imgDimensions={imgDimensions}
          imgAlignment={imgAlignment}
          initialOpen={true}
        />
        <FontSizePanel
          setAttributes={setAttributes}
          titleTag={titleTag}
          fontSize={fontSize}
          initialOpen={false}
        />
        <FieldsPanel
          setAttributes={setAttributes}
          fields={fields}
          fieldData={fieldData}
        />
      </InspectorControls>

      {error && <div className="wp-museum-error">{error}</div>}

      <InfoContent
        objectID={objectID}
        title={displayTitle ? title : null}
        excerpt={displayExcerpt ? excerpt : null}
        imgIndex={imgIndex}
        imgURL={imgURL}
        imgHeight={imgHeight}
        imgWidth={imgWidth}
        displayImage={displayImage}
        objectURL={linkToObject ? objectURL : null}
        fields={fields}
        fieldData={fieldData}
        imgDimensions={imgDimensions}
        imgAlignment={imgAlignment}
        fontSize={fontSize}
        titleTag={titleTag}
        onSearchModalReturn={onSearchModalReturn}
        setAttributes={setAttributes}
        totalImages={totalImages}
      />
    </div>
  );
};

export default ObjectInfoEdit;
