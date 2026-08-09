import ChildObject from './child-object';
import { Button } from '@wordpress/components';

import type { ChildObjectRecord } from './child-object-state';
import type { ObjectKindChild } from '../../types';

interface ChildKindProps {
	kind: ObjectKindChild;
	kindObjects: ChildObjectRecord[];
	newChildObject: ( kind: ObjectKindChild ) => void;
	deleteChildObject: ( child: ChildObjectRecord, kind: ObjectKindChild ) => void;
	updateChildObject: (
		child: ChildObjectRecord,
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

	const updateTitle = ( child: ChildObjectRecord, newTitle: string ) => {
		updateChildObject( child, kind, { title: newTitle } );
	}

	const childElements = kindObjects ? kindObjects.map( childObject => (
		<ChildObject
			key               = { childObject.ID }
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
				variant   = 'primary'
			>
				New { label }
			</Button>
			{ !! childElements && childElements }
		</div>
	);
}

export default ChildKind;
