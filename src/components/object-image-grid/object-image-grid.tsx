import { useEffect, useState } from "@wordpress/element";
import type { CSSProperties } from "react";

import {
  getBestImage,
  getFirstObjectImage,
  MaybeLink,
} from "../../javascript/util";

import { fetchObjectImages } from "../../javascript/util";

import type { ObjectImagesResponse } from "../../types";

/**
 * Minimal object shape passed by callers (see src/blocks/collection/edit.js),
 * mapped locally from MuseumObject wire data — not the full MuseumObject type.
 */
interface GridObject {
  ID: number;
  title: string;
  URL: string;
  imgURL: string | null;
}

interface ObjectImageBoxProps {
  object: GridObject;
  onClickCallback?: (objectID: number) => unknown;
  imgStyle: CSSProperties;
  linkToObjects: boolean;
}

const ObjectImageBox = (props: ObjectImageBoxProps) => {
  const { object, onClickCallback, imgStyle, linkToObjects } = props;

  const [imgData, setImgData] = useState<ObjectImagesResponse | null>(null);

  useEffect(() => {
    fetchObjectImages(object.ID).then((result) => {
      if (result) {
        setImgData(result);
      }
    });
  }, [object]);

  const placeholder = (
    <div className="grid-image-wrapper" style={imgStyle}>
      <div className="placeholder-box"></div>
    </div>
  );

  if (imgData === null) {
    return placeholder;
  }

  const imgDimensions = {
    height: 300,
    width: 300,
  };

  const image = getFirstObjectImage(imgData);
  const bestImage = getBestImage(image, imgDimensions);

  // An object can reach here with no gallery image to show: the grid filters
  // on the object's thumbnail, which is its featured image, and that is set
  // independently of the gallery fetched above. Hold the slot rather than
  // emitting an <img> with no src.
  if (bestImage.URL === null) {
    return placeholder;
  }

  return (
    <div className="grid-image-wrapper" style={imgStyle}>
      <MaybeLink href={object.URL} doLink={linkToObjects}>
        <img
          src={bestImage.URL}
          title={image?.title || ""}
          alt={image?.alt || ""}
          onClick={
            onClickCallback ? () => onClickCallback(object.ID) : undefined
          }
        />
      </MaybeLink>
    </div>
  );
};

interface ObjectImageGridProps {
  objects: GridObject[];
  numObjects: number;
  columns: number;
  linkToObjects: boolean;
  onClickCallback?: (objectID: number) => unknown;
}

const ObjectImageGrid = (props: ObjectImageGridProps) => {
  const { objects, numObjects, columns, linkToObjects, onClickCallback } =
    props;

  const percentWidth = Math.round((1 / columns) * 100) + "%";
  const imgStyle: CSSProperties = {
    flexBasis: percentWidth,
  };

  const imageGrid = objects
    .filter((object) => object.imgURL)
    .slice(0, numObjects)
    .map((object, index) => {
      return (
        <ObjectImageBox
          key={index}
          object={object}
          onClickCallback={onClickCallback}
          imgStyle={imgStyle}
          linkToObjects={linkToObjects}
        />
      );
    });

  return <div className="museum-blocks-image-grid">{imageGrid}</div>;
};

export default ObjectImageGrid;
