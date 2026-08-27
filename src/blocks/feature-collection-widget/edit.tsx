/**
 * WordPress dependencies
 */
import {
	useState,
	useEffect
} from '@wordpress/element';

import {
	useSelect
} from '@wordpress/data';

import apiFetch from '@wordpress/api-fetch';

import {
	InspectorControls
} from '@wordpress/block-editor';

import {
	CheckboxControl
} from '@wordpress/components';

import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { FeaturedCollection } from '../../components';

import {
	baseRestPath
} from '../../javascript/util';

import type { MuseumObject } from '../../types';

interface FeaturedCollectionEditAttributes {
	showFeatureImage: boolean;
	showDescription: boolean;
}

interface FeaturedCollectionEditProps {
	attributes: FeaturedCollectionEditAttributes;
	setAttributes: ( attributes: Partial<FeaturedCollectionEditAttributes> ) => void;
}

const FeaturedCollectionEdit = ( props: FeaturedCollectionEditProps ) => {
	const {
		attributes,
		setAttributes
	} = props;

	const {
		showFeatureImage,
		showDescription
	} = attributes;

	const [ objectData, setObjectData ] = useState( {} as Partial<MuseumObject> );

	const postID = useSelect (
		select => ( select( 'core/editor' ) as { getCurrentPostId: () => number } ).getCurrentPostId(),
		[]
	);

	const getObjectData = () => {
		apiFetch<MuseumObject>( { path: `${baseRestPath}/all/${postID}` } )
			.then( result => {
				setObjectData( result );
			} );
	}

	useEffect( () => {
		getObjectData();
	}, [] );

	// collections is a { collectionPostID: collectionTitle } map, and
	// serializes as `[]` rather than `{}` when the object is in no collection.
	const collectionIDs = Object.keys( objectData.collections ?? {} ).map( Number );

	const collectionBoxes = collectionIDs.map( collectionID =>
		<FeaturedCollection
			key             = { collectionID }
			collectionID    = { collectionID }
			showImage       = { showFeatureImage }
			showDescription = { showDescription }
		/>
	);

	return (
		<>
		<InspectorControls>
			<CheckboxControl
				label    = { __( 'Show collection featured image.' ) }
				checked  = { showFeatureImage }
				onChange = { ( checked: boolean ) => setAttributes( { showFeatureImage: checked } ) }
			/>
			<CheckboxControl
				label    = { __( 'Show collection description') }
				checked  = { showDescription }
				onChange = { ( checked: boolean ) => setAttributes( { showDescription: checked } ) }
			/>
		</InspectorControls>
		<div className = 'wpm-feature-collection-widget'>
			{ collectionBoxes.length > 0 && collectionBoxes }
		</div>
		</>
	);
}

export default FeaturedCollectionEdit;
