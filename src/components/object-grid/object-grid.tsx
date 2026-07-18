/**
 * Displays a grid of objects with captions.
 */

import { useState, useEffect } from "@wordpress/element";
import type { CSSProperties, MouseEventHandler } from "react";

import {
  MaybeLink,
  fetchObjectImages,
  getBestImage,
  getFirstObjectImage,
} from "../../javascript/util";

import ObjectModal from "../object-modal/object-modal";

import type { MuseumObject, ObjectImagesResponse } from "../../types";

interface ObjectGridBoxProps {
  mObject: MuseumObject;
  // TODO(ts-migration): defaults to "" (a string), while ObjectGrid passes a
  // CSSProperties object; kept as-is and cast on the style attribute below.
  imgStyle?: CSSProperties | string;
  displayTitle?: boolean;
  displayDate?: boolean;
  displayExcerpt?: boolean;
  linkToObject?: boolean;
  onClickCallback?: (() => void) | null;
  imgURL?: string | null;
}

const ObjectGridBox = (props: ObjectGridBoxProps) => {
  const {
    mObject,
    imgStyle = "",
    displayTitle = true,
    displayDate = false,
    displayExcerpt = false,
    linkToObject = true,
    onClickCallback = null,
    imgURL = null,
  } = props;

  const {
    post_title: postTitle,
    post_date: postDate,
    excerpt,
    link,
    thumbnail,
  } = mObject;

  const decodedPostTitle = postTitle
    ? new DOMParser().parseFromString(postTitle, "text/html").documentElement
        .textContent
    : postTitle;

  let useImgURL: string | null;
  if (imgURL) {
    useImgURL = imgURL;
  } else {
    useImgURL = null;
  }

  return (
    <div className="object-grid-box-wrapper" style={imgStyle as CSSProperties}>
      <MaybeLink
        href={link}
        doLink={linkToObject}
        // MaybeLink types the prop as MouseEventHandler | undefined; local
        // default is null (falsy either way — MaybeLink truthiness-checks it).
        onClickCallback={
          onClickCallback as unknown as
            | MouseEventHandler<HTMLAnchorElement>
            | undefined
        }
      >
        <div className="object-grid-box">
          <div className="object-grid-thumbnail-div">
            {!!useImgURL && (
              <img
                src={useImgURL}
                title={decodedPostTitle}
                alt={decodedPostTitle}
              />
            )}
            {!useImgURL && <div className="placeholder"></div>}
          </div>
          <div className="object-grid-caption-div">
            {displayDate && !!postDate && (
              <div className="ogc-date">{postDate}</div>
            )}
            {displayTitle && !!decodedPostTitle && <h3>{decodedPostTitle}</h3>}
            {displayExcerpt && !!excerpt && (
              <div className="ogc-excerpt">{excerpt}</div>
            )}
          </div>
        </div>
      </MaybeLink>
    </div>
  );
};

interface ObjectGridBoxDynamicImageProps {
  mObject: MuseumObject;
  displayTitle?: boolean;
  displayDate?: boolean;
  displayExcerpt?: boolean;
  linkToObject?: boolean;
  imgStyle?: CSSProperties | string;
  targetWidthHeight?: number;
  doObjectModal?: boolean;
}

const ObjectGridBoxDynamicImage = (props: ObjectGridBoxDynamicImageProps) => {
  const {
    mObject,
    displayTitle,
    displayDate,
    displayExcerpt,
    linkToObject,
    imgStyle,
    targetWidthHeight = 300,
    doObjectModal = false,
  } = props;

  const {
    post_title: postTitle,
    post_date: postDate,
    excerpt,
    link,
    thumbnail,
  } = mObject;

  const decodedPostTitle = postTitle
    ? new DOMParser().parseFromString(postTitle, "text/html").documentElement
        .textContent
    : postTitle;

  const [imgData, setImgData] = useState<ObjectImagesResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setImgData(null);
    fetchObjectImages(mObject.ID).then((result) => {
      if (result !== null) {
        // TODO(ts-migration): fetchObjectImages (src/javascript/util) returns
        // Promise<unknown> from untyped apiFetch; cast to the known response shape.
        setImgData(result as ObjectImagesResponse);
      }
    });
  }, [mObject]);

  let bestImage = null;
  let usePlaceholder = false;
  if (imgData !== null) {
    if (Object.entries(imgData).length > 0) {
      // Non-null: imgData has entries here, so getFirstObjectImage cannot
      // return null.
      bestImage = getBestImage(getFirstObjectImage(imgData)!, {
        width: targetWidthHeight,
        height: targetWidthHeight,
      });
    } else {
      // imgData is an empty array, use placeholder
      usePlaceholder = true;
    }
  }

  const handleClick = () => {
    if (doObjectModal) {
      setModalOpen(true);
    } else {
      window.open(link, "_self");
    }
  };

  return (
    <>
      <ObjectGridBox
        mObject={mObject}
        imgStyle={imgStyle}
        displayTitle={displayTitle}
        displayDate={displayDate}
        displayExcerpt={displayExcerpt}
        linkToObject={linkToObject}
        onClickCallback={handleClick}
        imgURL={
          usePlaceholder
            ? "/wp-content/plugins/wp-museum/src/assets/museum-icon-darkgray-1024.png"
            : !!bestImage
              ? bestImage.URL
              : null
        }
      />
      {doObjectModal && modalOpen && (
        <ObjectModal
          title={decodedPostTitle}
          content={excerpt}
          url={link}
          linkText="View full entry"
          // TODO(strict): possible null at runtime — modal can open before the
          // image fetch resolves; ObjectModal would then crash on Object.values.
          images={imgData!}
          close={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

interface ObjectGridProps {
  mObjects: MuseumObject[];
  columns?: number;
  displayTitle?: boolean;
  displayDate?: boolean;
  displayExcerpt?: boolean;
  linkToObjects?: boolean;
  doObjectModal?: boolean;
}

const ObjectGrid = (props: ObjectGridProps) => {
  const {
    mObjects,
    columns = 3,
    displayTitle = true,
    displayDate = false,
    displayExcerpt = false,
    linkToObjects = false,
    doObjectModal = true,
  } = props;

  if (!mObjects || mObjects.length == 0) {
    return null;
  }

  const percentWidth = Math.round((1 / columns) * 100) + "%";
  const imgStyle: CSSProperties = {
    flexBasis: `calc(${percentWidth} - 10px)`,
  };

  const gridObjects = mObjects.map((mObject) => (
    <ObjectGridBoxDynamicImage
      mObject={mObject}
      imgStyle={imgStyle}
      displayTitle={displayTitle}
      displayDate={displayDate}
      displayExcerpt={displayExcerpt}
      linkToObject={linkToObjects}
      doObjectModal={doObjectModal}
      key={mObject.ID}
    />
  ));

  return <div className="wpm-object-grid">{gridObjects}</div>;
};

export default ObjectGrid;
