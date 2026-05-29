import apiFetch from '@wordpress/api-fetch';

import {
	useState,
	useEffect
} from '@wordpress/element';

import {
	useSelect
} from '@wordpress/data';

import {
	registerPlugin,
	getPlugin
} from '@wordpress/plugins';

import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { ObjectEditorTable } from '../../components';
import CollectionSettingsPanel from './collection-options';

const CollectionObjects = ( { attributes, setAttributes } ) => {
	const { resultsPerPage = 20 } = attributes;

	const postID = useSelect (
		select => select( 'core/editor' ).getCurrentPostId(),
		[]
	);

	const isSavingPost = useSelect( select => select( 'core/editor').isSavingPost() );

	const [ associatedObjects, setAssociatedObjects ] = useState( [] );

	const baseRestPath = '/wp-museum/v1';

	const getAssociatedObjects = () => {
		setAssociatedObjects( [] );
		apiFetch( { path: `${baseRestPath}/collections/${postID}/objects`}).then(
			results => {
				setAssociatedObjects( results );
			}
		);
	}

	useEffect( () => {
		if ( ! isSavingPost ) {
			getAssociatedObjects();
		}
	}, [ isSavingPost ] );

	if ( typeof getPlugin( 'wpm-collection-settings-panel' ) === 'undefined' ) {
		registerPlugin( 'wpm-collection-settings-panel', {
			render: () => <CollectionSettingsPanel />
		} );
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Display' ) }>
					<SelectControl
						label={ __( 'Results per Page' ) }
						value={ resultsPerPage }
						onChange={ ( val ) => setAttributes( { resultsPerPage: parseInt( val ) } ) }
						options={ [
							{ value: 20,  label: '20' },
							{ value: 40,  label: '40' },
							{ value: 60,  label: '60' },
							{ value: 80,  label: '80' },
							{ value: 100, label: '100' },
							{ value: -1,  label: __( 'Unlimited' ) },
						] }
					/>
				</PanelBody>
			</InspectorControls>
			<div>
				<h2>Associated Objects</h2>
				{ associatedObjects.length > 0 ?
					<ObjectEditorTable
						mObjects = { associatedObjects }
					/>
					:
					<em>No objects found.</em>
				}
			</div>
		</>
	);
}

export default CollectionObjects;