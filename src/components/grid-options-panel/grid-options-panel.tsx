/**
 * WordPress dependencies
 */
import {
	PanelBody,
	CheckboxControl,
} from '@wordpress/components';

interface GridOptionsPanelProps {
	/** Whether to display a title for the block. */
	displayTitle?: boolean;
	/** Whether to display a caption for the block. */
	displayCaption?: boolean;
	/** Whether to display catalogue ID. */
	displayCatID?: boolean;
	/** Whether images should link to objects. */
	linkToObject?: boolean;
	/** Whether panel should be open by default. */
	initialOpen?: boolean;
	/** Callback function to update block attributes. */
	setAttributes: ( attributes: {
		displayTitle?: boolean;
		displayCaption?: boolean;
		displayCatID?: boolean;
		linkToObject?: boolean;
	} ) => void;
}

/**
 * Inspector panel controlling whether to display title, caption for the block
 * and whether clicking on images will link to the associated object.
 *
 * @param props                The component's properties.
 * @param props.displayTitle   Whether to display a title for the block.
 * @param props.displayCaption Whether to display a caption for the block.
 * @param props.displayCatID   Whether to display catalogue ID.
 * @param props.linkToObject   Whether images should link to objects.
 * @param props.initialOpen    Whether panel should be open by default.
 * @param props.setAttributes  Callback function to update block attributes.
 */
const GridOptionsPanel = ( props: GridOptionsPanelProps ) => {
	const {
		displayTitle,
		displayCaption,
		displayCatID,
		linkToObject,
		initialOpen,
		setAttributes,
	} = props;

	return (
		<PanelBody
			title       = "Options"
			initialOpen = { initialOpen }
		>
			{ typeof displayTitle != 'undefined' &&
				<CheckboxControl
					label = 'Display Title'
					checked = { displayTitle }
					onChange = { ( val ) => setAttributes( { displayTitle: val } ) }
				/>
			}
			{ typeof displayCaption != 'undefined' &&
				<CheckboxControl
					label = 'Display Caption'
					checked = { displayCaption }
					onChange = { ( val ) => setAttributes( { displayCaption: val } ) }
				/>
			}
			{ typeof displayCatID != 'undefined' &&
				<CheckboxControl
					label = 'Display Catalogue ID'
					checked = { displayCatID }
					onChange = { ( val ) => setAttributes( { displayCatID: val } ) }
				/>
			}
			{ typeof linkToObject != 'undefined' &&
				<CheckboxControl
					label = 'Link to Objects'
					checked = { linkToObject }
					onChange = { ( val ) => setAttributes( { linkToObject: val } ) }
				/>
			}
		</PanelBody>
	);
}

export default GridOptionsPanel;
