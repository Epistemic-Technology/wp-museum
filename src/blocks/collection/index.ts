/**
 * A block showing a collection along with some of its members.
 *
 * This block is dynamic, so attributes are defined server-side.
 * @see src/blocks/collection-block-frontend.php
 *
 * Attributes:
 *  - numObjects        {number}  The number of object images from collection to display.
 *  - columns           {number}  The max columns in object image grid.
 *  - collectionID      {number}  The WordPress post_id of the collection.
 *  - collectionURL     {string}  The permalink of the collection.
 *  - collectionObjects {array}   Data for objects contained in collection.
 *  - thumbnailURL      {string}  URL of the collection's thumbnail.
 *  - imgDimensions     {object}  Width, height, and size of collection's thumbnail.
 *  - title             {string}  Title of the collection.
 *  - excerpt           {string}  Excerpt of the collection description.
 *  - fontSize          {number}  Fontsize for excerpt (em).
 *  - titleTag          {string}  HTML element for displaying title (h1, h2, p, etc.)
 *  - imgAlignment      {string}  Alignment for thumbnail (left | center | right).
 *  - displayTitle      {booleam} Whether to display title.
 *  - linkToObjects     {boolean} Whether to link to collection objects.
 *  - displayExcerpt    {boolean} Whether to display excerpt.
 *  - displayObjects    {boolean} Whether to dispaly objects.
 *  - displayThumbnail  {boolean} Whether to display thumbnail.
 */

/**
 * WordPress dependencies
 */
import { registerMuseumBlock } from "../register-museum-block";
import { __ } from "@wordpress/i18n";

/**
 * Internal dependencies
 */
import edit from "./edit";

import { museum } from "../../icons";

registerMuseumBlock("wp-museum/collection", {
  title: __("Collection"),
  category: "wp-museum",
  icon: museum,
  edit,
  save: () => null,
});
