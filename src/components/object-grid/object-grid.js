/**
 * Displays a grid of objects with captions.
 */

import { useState, useEffect } from "@wordpress/element";

import {
  MaybeLink,
  fetchObjectImages,
  getBestImage,
  getFirstObjectImage,
} from "../../javascript/util";

import ObjectModal from "../object-modal/object-modal";

const ObjectGridBox = (props) => {
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

  let useImgURL;
  if (imgURL) {
    useImgURL = imgURL;
  } else {
    useImgURL = null;
  }

  return (
    <div className="object-grid-box-wrapper" style={imgStyle}>
      <MaybeLink
        href={link}
        doLink={linkToObject}
        onClickCallback={onClickCallback}
      >
        <div className="object-grid-box">
          <div className="object-grid-thumbnail-div">
            {!!useImgURL && <img src={useImgURL} title={decodedPostTitle} alt={decodedPostTitle} />}
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

const ObjectGridBoxDynamicImage = (props) => {
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

  const [imgData, setImgData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setImgData(null);
    fetchObjectImages(mObject.ID).then((result) => {
      if (result) {
        setImgData(result);
      }
    });
  }, [mObject]);

  let bestImage = null;
  if (imgData != null && Object.entries(imgData).length > 0) {
    bestImage = getBestImage(getFirstObjectImage(imgData), {
      width: targetWidthHeight,
      height: targetWidthHeight,
    });
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
        imgURL={!!bestImage ? bestImage.URL : null}
      />
      {doObjectModal && modalOpen && (
        <ObjectModal
          title={decodedPostTitle}
          content={excerpt}
          url={link}
          linkText="View full entry"
          images={imgData}
          close={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

const ObjectGrid = (props) => {
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
  const imgStyle = {
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
