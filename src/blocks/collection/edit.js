/**
 * Gutenberg editor view for Collection block. Creates <Collection> component.
 */

/**
 * WordPress dependencies.
 */
import { useState } from "@wordpress/element";

import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

import {
  PanelBody,
  CheckboxControl,
  RangeControl,
} from "@wordpress/components";

import apiFetch from "@wordpress/api-fetch";

// Utility function to decode HTML entities
const decodeHtmlEntities = (text) => {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
};

/**
 * Internal dependencies.
 */

import {
  ImageSizePanel,
  ObjectImageGrid,
  ThumbnailImage,
  FontSizePanel,
  CollectionEmbedPanel,
  CollectionSearchBox,
} from "../../components";

const Collection = (props) => {
  const { attributes, setAttributes } = props;

  const {
    numObjects,
    columns,
    collectionID,
    collectionURL,
    collectionObjects,
    thumbnailURL,
    imgDimensions,
    title,
    excerpt,
    fontSize,
    titleTag,
    displayTitle,
    linkToObjects,
    displayExcerpt,
    displayObjects,
    displayThumbnail,
    imgAlignment,
  } = attributes;

  const TitleTag = titleTag;

  const maxDisplayObjects = Math.max(collectionObjects.length, 4);

  const [modalOpen, setModalOpen] = useState(false);

  const onSearchModalReturn = (newCollectionID) => {
    setAttributes({ collectionID: newCollectionID });

    const baseRestPath = "/wp-museum/v1/";

    if (newCollectionID) {
      const collectionRestPath = `${baseRestPath}collections/${newCollectionID}`;
      apiFetch({ path: collectionRestPath }).then((result) => {
        const newThumbnailURL =
          result["thumbnail"].length > 0 ? result["thumbnail"][0] : null;

        setAttributes({
          title: result["post_title"],
          collectionURL: result["link"],
          thumbnailURL: newThumbnailURL,
          excerpt: result["excerpt"],
        });

        const objectsRestPath = `${baseRestPath}collections/${newCollectionID}/objects`;
        apiFetch({ path: objectsRestPath }).then((result) => {
          if (Array.isArray(result) && result.length > 0) {
            const newCollectionObjects = result.map((result) => {
              const objImgURL =
                result["thumbnail"].length > 0 ? result["thumbnail"][0] : null;
              return {
                imgURL: objImgURL,
                title: result["post_title"],
                URL: result["link"],
                ID: result["ID"],
              };
            });
            setAttributes({
              collectionObjects: newCollectionObjects,
            });
          }
        });
      });
    }
  };

  return (
    <>
      <InspectorControls>
        <CollectionEmbedPanel
          collectionID={collectionID}
          title={title}
          URL={collectionURL}
          onSearchModalReturn={onSearchModalReturn}
          initialOpen={true}
        />
        <PanelBody initialOpen={true}>
          <RangeControl
            label="Collection Items to Display"
            value={numObjects}
            onChange={(newNum) => setAttributes({ numObjects: newNum })}
            min={1}
            max={maxDisplayObjects}
            disabled={!displayObjects}
          />
          <RangeControl
            label="Columns"
            value={columns}
            onChange={(newCols) => setAttributes({ columns: newCols })}
            min={1}
            max={8}
            disabled={!displayObjects}
          />
        </PanelBody>
        <PanelBody initialOpen={true} title="Options">
          <CheckboxControl
            label="Display Collection Title"
            checked={displayTitle}
            onChange={(val) => setAttributes({ displayTitle: val })}
          />
          <CheckboxControl
            label="Display Excerpt"
            checked={displayExcerpt}
            onChange={(val) => setAttributes({ displayExcerpt: val })}
          />
          <CheckboxControl
            label="Display Collection Thumbnail"
            checked={displayThumbnail}
            onChange={(val) => setAttributes({ displayThumbnail: val })}
          />
          <CheckboxControl
            label="Display Object Images"
            checked={displayObjects}
            onChange={(val) => setAttributes({ displayObjects: val })}
          />
          <CheckboxControl
            label="Link to Objects"
            checked={linkToObjects}
            onChange={(val) => setAttributes({ linkToObjects: val })}
          />
        </PanelBody>
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
      </InspectorControls>
      <div {...useBlockProps({ className: "museum-collection-block" })}>
        <div className={`collection-block-upper-content img-${imgAlignment}`}>
          {displayThumbnail && (
            <div className="thumbnail-wrapper">
              {thumbnailURL && (
                <ThumbnailImage
                  thumbnailURL={thumbnailURL}
                  imgDimensions={imgDimensions}
                  setSearchModalOpen={setModalOpen}
                />
              )}
              {modalOpen && (
                <CollectionSearchBox
                  close={() => setModalOpen(false)}
                  returnCallback={onSearchModalReturn}
                />
              )}
            </div>
          )}
          <div className="collection-info">
            {displayTitle && title && (
              <TitleTag>
                <a href={collectionURL}> {decodeHtmlEntities(title)}</a>
              </TitleTag>
            )}
            {displayExcerpt && excerpt && (
              <div
                className="collection-excerpt"
                style={{ fontSize: fontSize + "em" }}
              >
                {excerpt}
                {collectionURL && (
                  <span>
                    {" "}
                    (<a href={collectionURL}>Read More</a>)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="collection-block-lower-content">
          {displayObjects && (
            <ObjectImageGrid
              objects={collectionObjects}
              numObjects={numObjects}
              columns={columns}
              linkToObjects={linkToObjects}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Collection;
