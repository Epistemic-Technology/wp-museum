/**
 * Deprecated versions of the Object Image block.
 *
 * Each entry here is a FROZEN SNAPSHOT of a registration that once shipped.
 * It exists so that content saved by that version still parses, and it must
 * never be "kept in sync" with ./index.ts or ./save.tsx — changing it to match
 * the current block is exactly what breaks the posts it is here to rescue.
 * A new change to save() output needs a new entry, not an edit to this one.
 */

import { RichText } from '@wordpress/block-editor';

import type { ImageDimensions } from '../../components/image-size-panel/image-size-panel';

/**
 * Attributes as registered before imgAlignment existed. `fontSize` kept the
 * block API's undocumented `'float'` type, which WordPress treats as untyped,
 * so any stored value validated.
 */
const v1Attributes = {
	align: { type: 'string', default: 'left' },
	objectID: { type: 'number', default: null },
	catID: { type: 'string', default: 'No Object Selected' },
	title: { type: 'string', default: 'No Object Selected' },
	captionText: { type: 'string', default: null },
	imgHeight: { type: 'number', default: null },
	imgWidth: { type: 'number', default: null },
	imgURL: { type: 'string', default: null },
	imgIndex: { type: 'number', default: 0 },
	totalImages: { type: 'number', default: 0 },
	objectURL: { type: 'string', default: null },
	displayTitle: { type: 'boolean', default: true },
	displayCatID: { type: 'boolean', default: true },
	displayCaption: { type: 'boolean', default: true },
	linkToObject: { type: 'boolean', default: true },
	imgDimensions: {
		type: 'object',
		default: { width: 300, height: 300, size: 'medium' },
	},
	fontSize: { type: 'float', default: 0.7 },
	titleTag: { type: 'string', default: 'h6' },
};

interface V1Attributes {
	title: string;
	catID: string;
	captionText: string | null;
	imgURL: string | null;
	objectURL: string | null;
	displayTitle: boolean;
	displayCatID: boolean;
	displayCaption: boolean;
	linkToObject: boolean;
	imgDimensions: ImageDimensions;
	fontSize: number;
	titleTag: string;
}

/**
 * save() as it shipped, up to the accessibility pass of August 2025 (180debf).
 *
 * Two things about the <img> are deliberate and must stay wrong here:
 *
 *  - The class was built from an imgAlignment attribute that was never
 *    registered and so was always undefined, which is why the literal string
 *    below sits in every post this version saved rather than an alignment.
 *  - There is no alt attribute. 180debf added one built from `imgAlt` and
 *    `imgTitle`, neither of which existed, so from then until 9bd29c5 save()
 *    threw whenever an image was selected and could write no markup at all.
 *    9bd29c5 repaired it to read the `title` attribute and judged that no
 *    deprecation was needed because no such markup could exist — but content
 *    saved BEFORE 180debf does exist, and it carries no alt. That content has
 *    been failing validation ever since; this entry is what rescues it.
 */
function v1Save( { attributes }: { attributes: V1Attributes } ) {
	const {
		title,
		catID,
		captionText,
		imgURL,
		objectURL,
		displayTitle,
		displayCatID,
		displayCaption,
		linkToObject,
		imgDimensions,
		fontSize,
		titleTag,
	} = attributes;

	const TitleTag = titleTag as keyof JSX.IntrinsicElements;

	const body = (
		<>
			{ imgURL && imgDimensions.height && imgDimensions.width &&
				<img
					className = 'image-selector-image-undefined'
					src       = { imgURL }
					height    = { imgDimensions.height }
					width     = { imgDimensions.width }
				/>
			}
			{ displayTitle && title &&
				<TitleTag>
					{ title }
				</TitleTag>
			}
			{ displayCatID && catID &&
				<div
					style     = { { fontSize: fontSize + 'em' } }
				>
					{ catID }
				</div>
			}
			{ displayCaption && captionText &&
				<RichText.Content
					className = 'caption-text-field'
					style     = { { fontSize: fontSize + 'em' } }
					tagName   = 'p'
					value     = { captionText }
				/>
			}
		</>
	);

	const linkedBody = ( linkToObject && objectURL ) ? <a className='object-link' href={ objectURL }>{ body }</a> : body;

	return (
		<div
			className = 'image-selector'
		>
			{ linkedBody }
		</div>
	);
}

/**
 * The pre-imgAlignment block.
 *
 * `supports` has to be restated: WordPress builds a deprecation from the
 * current block type with attributes, supports, save and migrate stripped out,
 * so leaving it off would drop the align support that writes the alignleft /
 * alignright / aligncenter class into the markup being validated.
 *
 * The migration settles on 'left' because that is the block's new default and
 * `.image-selector-image-left` carries no rules — the image lands exactly
 * where the unstyled `-undefined` class left it.
 */
const v1 = {
	attributes: v1Attributes,
	supports: {
		align: [ 'left', 'right', 'center' ],
	},
	save: v1Save,
	migrate: ( attributes: V1Attributes ) => ( {
		...attributes,
		imgAlignment: 'left',
	} ),
};

export default [ v1 ];
