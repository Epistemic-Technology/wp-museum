/**
 * Field validation for the object-meta block.
 *
 * Kept out of edit.tsx so the rules can be exercised directly: the editor's
 * validate-everything pass used to iterate `Object.entries()` and hand
 * `[ key, value ]` tuples to a function expecting the field itself, which made
 * every check a silent no-op.
 */

import type { ReactNode } from 'react';

import { stripslashes } from '../../javascript/util';

import type { MObjectField, ObjectFieldsResponse } from '../../types';

/**
 * Validates one field's current value.
 *
 * @param field The field's metadata.
 * @param value The value currently held for it.
 * @return The error to show beneath the field, or null when it is valid.
 */
export const fieldError = (
	field: MObjectField,
	value: unknown
): ReactNode => {
	const { field_schema: fieldSchema, required } = field;

	if ( required && ! value ) {
		return <span>Field is required but empty.</span>;
	}

	if ( fieldSchema ) {
		// A field_schema is a user-authored regex source and may not compile.
		// This runs over every field of an object, so one malformed schema
		// must not break validation for the rest.
		try {
			const regex = new RegExp( '^' + stripslashes( fieldSchema ) + '$' );
			if ( ! regex.test( String( value ?? '' ) ) ) {
				// Schema mismatches are deliberately not surfaced yet; the
				// rule has never been enabled. Tracked in #147.
				// return <span>Value does not conform to schema.</span>;
			}
		} catch {
			// An uncompilable pattern yields no error.
		}
	}

	return null;
}

/**
 * Validates every field of an object.
 *
 * @param fieldData  The object type's fields, keyed however the REST response
 *                   keys them — the returned map is keyed by field slug.
 * @param attributes The block attributes holding the current field values.
 * @return Errors keyed by field slug; a slug maps to null when it is valid.
 */
export const allFieldErrors = (
	fieldData: ObjectFieldsResponse,
	attributes: Record< string, unknown >
): Record< string, ReactNode > => {
	const errors: Record< string, ReactNode > = {};
	for ( const field of Object.values( fieldData ) ) {
		errors[ field.slug ] = fieldError( field, attributes[ field.slug ] );
	}
	return errors;
}
