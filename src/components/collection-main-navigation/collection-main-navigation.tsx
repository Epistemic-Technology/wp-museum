/**
 * Hierarchical navigation tree for collections.
 */

import { useState } from "@wordpress/element";

import { Button } from "@wordpress/components";

import type { CSSProperties } from "react";

import { info } from "../../icons";

import { isEmpty, sortCollections } from "../../javascript/util";

import type { Collection } from "../../types";

/**
 * A Collection after processing by sortCollections(), which mutates each
 * collection in place to add an `indentLevel` (and a transient `foundParent`
 * used during sorting).
 */
interface NavigationCollection extends Collection {
  indentLevel: number;
  foundParent?: boolean;
}

/**
 * Attributes of the collection-main-navigation block (see
 * src/blocks/collection-main-navigation/block.json).
 */
interface CollectionMainNavigationAttributes {
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  verticalSpacing: number;
  useDefaultFontSize: boolean;
  useDefaultFontColor: boolean;
  useDefaultBackgroundColor: boolean;
  useDefaultBorderColor: boolean;
  useDefaultBorderWidth: boolean;
  useDefaultVerticalSpacing: boolean;
  subCollectionIndent: number;
  sortBy: string;
  sortOrder: string;
  tags: string[];
}

interface CollectionBoxProps extends CollectionMainNavigationAttributes {
  theCollection: NavigationCollection;
}

/**
 * A single box in the collection tree.
 */
const CollectionBox = (props: CollectionBoxProps) => {
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

  const boxStyle: CSSProperties = {
    marginLeft: theCollection.indentLevel * subCollectionIndent + "em",
  };
  const titleStyle: CSSProperties = {};

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
          <a href={theCollection.link} aria-label={`View ${decodedTitle} collection`}>{decodedTitle}</a>
        </span>
        <span>
          <Button
            className="wpm-collection-main-navigation-collection-box-info-button"
            icon={info}
            aria-label={`${showExcerpt ? 'Hide' : 'Show'} information about ${decodedTitle} collection`}
            aria-expanded={showExcerpt}
            onClick={toggleShowExcerpt}
          />
        </span>
      </div>
      <div
        className={`wpm-collection-main-navigation-collection-box-excerpt ${excerptStateClass}`}
        aria-hidden={!showExcerpt}
      >
        {theCollection.excerpt}
        <div className="wpm-collection-main-navigation-collection-box-excerpt-more">
          <a href={theCollection.link} aria-label={`View full details about the ${theCollection.post_title} collection`}>
            More about the {theCollection.post_title} Collection...
          </a>
        </div>
      </div>
    </div>
  );
};

interface CollectionMainNavigationProps {
  collectionData: Collection[];
  attributes: CollectionMainNavigationAttributes;
}

const CollectionMainNavigation = (props: CollectionMainNavigationProps) => {
  const { collectionData, attributes } = props;

  const { sortBy, sortOrder } = attributes;

  let collectionBoxes = null;
  if (!isEmpty(collectionData)) {
    // sortCollections is typed as returning SortableCollection[] (optional
    // indentLevel), but it assigns indentLevel to every collection it
    // returns, so the narrower NavigationCollection[] assertion is safe.
    const sortedCollections = sortCollections(
      collectionData,
      sortBy,
      sortOrder,
    ) as NavigationCollection[];
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

  return (
    <nav aria-label="Collection navigation" role="navigation">
      {collectionBoxes}
    </nav>
  );
};

export default CollectionMainNavigation;
