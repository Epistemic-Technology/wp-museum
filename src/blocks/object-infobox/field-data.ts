/**
 * Builds the per-field display data the object-infobox block stores in its
 * `fieldData` attribute.
 *
 * Kept out of edit.tsx so the formatting rules can be exercised directly.
 * What this produces is what the front end prints: render.php escapes and
 * echoes `content` as-is, so any type-specific formatting has to happen here.
 */

import type {
	MObjectField,
	MuseumObject,
	MuseumObjectFieldValue,
} from '../../types';

/**
 * Per-field display data stored in the fieldData attribute: the field's
 * display name and its (formatted) value for the embedded object.
 */
export interface InfoboxFieldData {
	name: string;
	content: MuseumObjectFieldValue | string;
}

/** What processFieldData returns; empty when there is nothing to process. */
export interface ProcessedFieldData {
	newFields?: Record< string, boolean >;
	fieldData?: Record< string, InfoboxFieldData >;
}

/**
 * Processes object field data for display in the infobox.
 *
 * @param objectData     The embedded object.
 * @param fieldsMetadata Metadata about the object type's fields.
 * @param currentFields  Which fields are currently selected for display.
 */
export const processFieldData = (
	objectData: MuseumObject,
	fieldsMetadata: Record< string, MObjectField >,
	currentFields: Record< string, boolean >
): ProcessedFieldData => {
	if ( ! objectData || ! fieldsMetadata ) return {};

	const newFields: Record< string, boolean > = {};
	const fieldData: Record< string, InfoboxFieldData > = {};

	for ( const key in fieldsMetadata ) {
		// Preserve current field selections or default to false.
		newFields[ key ] =
			typeof currentFields[ key ] === 'undefined'
				? false
				: currentFields[ key ];

		// Format content based on field type. A flag is a boolean on the
		// wire, and the front end escapes and prints whatever is saved here —
		// a bare boolean comes out as "1" or as nothing at all — so it has to
		// be rendered to text now.
		let content: MuseumObjectFieldValue = '';
		if ( fieldsMetadata[ key ][ 'type' ] === 'flag' ) {
			content = objectData[ fieldsMetadata[ key ][ 'slug' ] ] ? 'Yes' : 'No';
		} else {
			content = objectData[
				fieldsMetadata[ key ][ 'slug' ]
			] as MuseumObjectFieldValue;
		}

		fieldData[ key ] = {
			name: fieldsMetadata[ key ][ 'name' ],
			content,
		};
	}

	return { newFields, fieldData };
}
