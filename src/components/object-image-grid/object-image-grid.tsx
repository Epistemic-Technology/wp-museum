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

  if (imgData === null) {
    return (
      <div className="grid-image-wrapper" style={imgStyle}>
        <div className="placeholder-box"></div>
      </div>
    );
  }

  const imgDimensions = {
    height: 300,
    width: 300,
  };

  const bestImage = getBestImage(getFirstObjectImage(imgData), imgDimensions);

  // TODO(ts-migration): title/alt are read on the whole images map (keyed by
  // attachment ID), not on an individual image record — always undefined, so
  // these fall through to "". Preserving existing (buggy) behavior.
  const imgAttrs = {
    src: bestImage.URL,
    title: (imgData as any).title || "",
    alt: (imgData as any).alt || "",
  };

  return (
    <div className="grid-image-wrapper" style={imgStyle}>
      <MaybeLink href={object.URL} doLink={linkToObjects}>
        <img {...imgAttrs} onClick={() => onClickCallback(object.ID) || null} />
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
