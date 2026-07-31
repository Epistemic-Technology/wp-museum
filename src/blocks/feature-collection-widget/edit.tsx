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
	baseRestPath, isEmpty
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

	let collectionBoxes: JSX.Element[] = [];
	// TODO(ts-migration): This treats objectData.collections as an array of
	// collection IDs, but the wire shape is a {termId: termName} object (or []
	// when empty, per the PHP empty-array quirk) whose values are term NAMES.
	// Array.isArray() is therefore only true for the empty case, so
	// collectionBoxes is always empty. Pre-existing bug preserved via type
	// assertion.
	//
	// Iterating the object's keys is NOT a fix on its own: those keys are
	// wpm_collection_tax TERM ids, while FeaturedCollection fetches
	// /collections/{id}, which takes a collection POST id and does not even
	// check the post type (Collections_Controller::get_post). Feeding it term
	// ids would render arbitrary posts as featured collections. The REST layer
	// has to expose the collection post id (or a term -> post lookup) first.
	if ( ! isEmpty( objectData ) && Array.isArray( objectData.collections ) ) {
		collectionBoxes = ( objectData.collections as unknown as number[] ).map( collectionID =>
			<FeaturedCollection
				key             = { collectionID }
				collectionID    = { collectionID }
				showImage       = { showFeatureImage }
				showDescription = { showDescription }
			/>
		);
	}

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
