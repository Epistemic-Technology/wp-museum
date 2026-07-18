/**
 * Component for rendering infobox in Gutenberg editor.
 */

/**
 * WordPress dependencies.
 */
import { useState } from "@wordpress/element";

/**
 * Internal dependencies.
 */
import { hexToRgb } from "../../javascript/util";
import { ObjectSearchBox, ImageSelector } from "../../components";

// TODO(ts-migration): this block has always passed imgHeight/imgWidth to
// ImageSelector, which ImageSelectorProps does not declare (the component
// ignores them at runtime). Cast to keep the currently-working call site
// unchanged.
const ImageSelectorCompat = ImageSelector as any;

import type { ElementType, ReactNode } from "react";

import type {
  InfoboxFieldData,
  SetInfoboxAttributes,
} from "./edit";

import type { ImageDimensions } from "../../components/image-size-panel/image-size-panel";

/**
 * Image data returned from the ImageSelector component.
 */
interface ImgDataUpdate {
  imgIndex?: number;
  imgURL?: string | null;
  imgHeight?: number;
  imgWidth?: number;
  totalImages?: number;
}

interface InfoContentProps {
  title: string | null;
  excerpt: string | null;
  imgURL: string | null;
  imgIndex: number;
  imgHeight: number;
  imgWidth: number;
  displayImage: boolean;
  fields: Record<string, boolean>;
  fieldData: Record<string, InfoboxFieldData>;
  imgDimensions: ImageDimensions;
  imgAlignment: string;
  fontSize: number;
  titleTag: string;
  onSearchModalReturn: (postId: number | null) => void;
  objectID: number;
  setAttributes: SetInfoboxAttributes;
  totalImages: number;
  objectURL: string | null;
}

/**
 * Renders the editor content for the infobox.
 *
 * @param {object} props The component properties.
 * @see ./index.js for attribute descriptions.
 */
const InfoContent = (props: InfoContentProps) => {
  const {
    title,
    excerpt,
    imgURL,
    imgIndex,
    imgHeight,
    imgWidth,
    displayImage,
    fields,
    fieldData,
    imgDimensions,
    imgAlignment,
    fontSize,
    titleTag,
    onSearchModalReturn,
    objectID,
    setAttributes,
    totalImages,
  } = props;
  const [modalOpen, setModalOpen] = useState(false);

  Object.keys(fieldData).forEach((key) => {
    if (typeof fieldData[key]["content"] === "boolean") {
      fieldData[key]["content"] = fieldData[key]["content"] ? "Yes" : "No";
    }
    if (
      fieldData[key]["content"] === "" ||
      fieldData[key]["content"] === null ||
      fieldData[key]["content"] === undefined
    ) {
      fieldData[key]["content"] = "Unknown";
    }
  });

  let field_list: JSX.Element[] = [];
  if (Object.keys(fieldData).length === Object.keys(fields).length) {
    field_list = Object.keys(fields)
      .filter((key) => fields[key])
      .map((key) => (
        <li key={"field_list_" + key} style={{ fontSize: fontSize + "em" }}>
          <span className="field-name">{fieldData[key]["name"]}: </span>
          {/* TODO(ts-migration): content is typed as MuseumObjectFieldValue,
              which includes non-renderable link/array shapes; in practice
              those arrive as strings (or null, normalized to "Unknown"
              above). Cast to ReactNode to keep rendering unchanged. */}
          <span className="field-data">
            {fieldData[key]["content"] as ReactNode}
          </span>
        </li>
      ));
  }

  const TitleTag = titleTag as ElementType;

  /**
   * Update image data attributes from ImageSelector.
   *
   * @param {object} newImageData Image data returned from ImageSelector component
   */
  const setImgData = (newImageData: ImgDataUpdate) => {
    setAttributes(newImageData);

    if (!newImageData.imgURL && newImageData.imgIndex != imgIndex) {
      setAttributes({ imgURL: null });
    }
  };

  const body = (
    <div className={`infobox-body-wrapper img-${imgAlignment}`}>
      {displayImage && (
        <div className={`infobox-img-wrapper`}>
          {objectID ? (
            <ImageSelectorCompat
              imgHeight={imgHeight}
              imgWidth={imgWidth}
              objectID={objectID}
              imgIndex={imgIndex}
              imgURL={imgURL}
              imgDimensions={imgDimensions}
              setImgData={setImgData}
              totalImages={totalImages}
            />
          ) : (
            <>
              <div
                className="image-selector-placeholder"
                style={{
                  height: imgDimensions.height,
                  width: imgDimensions.width,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setModalOpen(true);
                }}
              >
                <div className="image-selector-placeholder-plus">+</div>
              </div>
              {modalOpen && (
                <ObjectSearchBox
                  close={() => setModalOpen(false)}
                  returnCallback={onSearchModalReturn}
                />
              )}
            </>
          )}
        </div>
      )}
      <div className="infobox-content-wrapper">
        {title === null || <TitleTag>{title}</TitleTag>}
        {excerpt === null || (
          <p style={{ fontSize: fontSize + "em" }}>{excerpt} </p>
        )}
        {field_list.length === 0 || <ul>{field_list}</ul>}
      </div>
    </div>
  );

  return <div className="info-outer-div">{body}</div>;
};

export default InfoContent;
