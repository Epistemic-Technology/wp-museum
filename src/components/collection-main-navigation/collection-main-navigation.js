/**
 * Hierarchical navigation tree for collections.
 */

import { useState } from "@wordpress/element";

import { Button } from "@wordpress/components";

import { info } from "../../icons";

import { isEmpty, sortCollections } from "../../javascript/util";

/**
 * A single box in the collection tree.
 */
const CollectionBox = (props) => {
  const {
    theCollection,
    fontSize,
    fontColor,
    backgroundColor,
    borderColor,
    borderWidth,
    verticalSpacing,
    useDefaultFontSize,
    useDefaultFontColor,
    useDefaultBackgroundColor,
    useDefaultBorderColor,
    useDefaultBorderWidth,
    useDefaultVerticalSpacing,
    subCollectionIndent,
  } = props;

  const [showExcerpt, setShowExcerpt] = useState(false);

  const toggleShowExcerpt = () => {
    setShowExcerpt(!showExcerpt);
  };

  const boxStyle = {
    marginLeft: theCollection.indentLevel * subCollectionIndent + "em",
  };
  const titleStyle = {};

  if (!useDefaultFontSize) {
    boxStyle.fontSize = `${fontSize}em`;
    titleStyle.fontSize = `${fontSize}em`;
  }
  if (!useDefaultFontColor) {
    titleStyle.color = `${fontColor}`;
  }
  if (!useDefaultBackgroundColor) {
    titleStyle.backgroundColor = `${backgroundColor}`;
  }
  if (!useDefaultBorderColor) {
    titleStyle.borderColor = `${borderColor}`;
  }
  if (!useDefaultBorderWidth) {
    titleStyle.borderWidth = `${borderWidth}px`;
    if (borderWidth > 0) {
      titleStyle.borderStyle = "solid";
    }
  }
  if (!useDefaultVerticalSpacing) {
    boxStyle.marginBottom = `${verticalSpacing}em`;
  }

  const excerptStateClass = showExcerpt ? "open" : "closed";
  const decodedTitle = (() => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = theCollection.post_title;
    return textarea.value;
  })();

  return (
    <div
      className={`wpm-collection-main-navigation-collection-box indent-${theCollection.indentLevel}`}
      style={boxStyle}
    >
      <div
        className="wpm-collection-main-navigation-collection-box-title-wrapper"
        style={titleStyle}
      >
        <span className="wpm-collection-main-navigation-collection-box-title">
          <a href={theCollection.link}>{decodedTitle}</a>
        </span>
        <span>
          <Button
            className="wpm-collection-main-navigation-collection-box-info-button"
            icon={info}
            onClick={toggleShowExcerpt}
          />
        </span>
      </div>
      <div
        className={`wpm-collection-main-navigation-collection-box-excerpt ${excerptStateClass}`}
      >
        {theCollection.excerpt}
        <div className="wpm-collection-main-navigation-collection-box-excerpt-more">
          <a href={theCollection.link}>
            More about the {theCollection.post_title} Collection...
          </a>
        </div>
      </div>
    </div>
  );
};

const CollectionMainNavigation = (props) => {
  const { collectionData, attributes } = props;

  const { sortBy, sortOrder } = attributes;

  let collectionBoxes = null;
  if (!isEmpty(collectionData)) {
    const sortedCollections = sortCollections(
      collectionData,
      sortBy,
      sortOrder,
    );
    collectionBoxes = sortedCollections.map((collection) => {
      return (
        <CollectionBox
          {...attributes}
          key={collection.ID}
          theCollection={collection}
        />
      );
    });
  } else {
    collectionBoxes = Array.from({ length: 3 }, () => {
      return (
        <div className="wpm-collection-box-placeholder">
          <div className="placeholder"></div>
        </div>
      );
    });
  }

  return collectionBoxes;
};

export default CollectionMainNavigation;
