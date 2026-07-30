import ChildObject from './child-object';
import { Button } from '@wordpress/components';

import type { MuseumObject, ObjectKindChild } from '../../types';

interface ChildKindProps {
	kind: ObjectKindChild;
	/**
	 * NOTE(wp-types): records freshly created through the editor are WP
	 * core REST responses (lowercase `id`) rather than museum-shaped objects;
	 * typed as MuseumObject[] to match how they are consumed.
	 */
	kindObjects: MuseumObject[];
	newChildObject: ( kind: ObjectKindChild ) => void;
	deleteChildObject: ( child: MuseumObject, kind: ObjectKindChild ) => void;
	updateChildObject: (
		child: MuseumObject,
		kind: ObjectKindChild,
		data: { title: string }
	) => void;
}

const ChildKind = ( props: ChildKindProps ) => {
	const {
		kind,
		kindObjects,
		newChildObject,
		deleteChildObject,
		updateChildObject
	} = props;

	const {
		label_plural,
		label,
	} = kind;

	const updateTitle = ( child: MuseumObject, newTitle: string ) => {
		updateChildObject( child, kind, { title: newTitle } );
	}

	const childElements = kindObjects ? kindObjects.map( ( childObject, index ) => (
		<ChildObject
			key               = { index }
			objectData        = { childObject }
			deleteChildObject = { ( child ) => deleteChildObject( child, kind ) }
			updateTitle       = { updateTitle }
		/>
	) ) : [];

	return (
		<div className = 'child-kind'>
			<h2>{ label_plural }</h2>
			<Button
				className = 'new-child-object'
				onClick   = { () => newChildObject( kind ) }
				isPrimary
			>
				New { label }
			</Button>
			{ !! childElements && childElements }
		</div>
	);
}

export default ChildKind;
