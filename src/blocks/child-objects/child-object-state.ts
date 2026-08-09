/**
 * State helpers for the child objects block.
 *
 * The block juggles two parallel maps, both keyed by kind_id:
 *
 * - `childObjects` — kind_id → child post IDs. This is the block's persisted
 *   attribute (post meta `wp-museum-child_objects`), and it is what the
 *   `/all/{id}/children` endpoint and object-meta/render.php read back. It is
 *   the source of truth for which children an object has.
 * - `childObjectData` — kind_id → child records, as returned by
 *   `/all/{id}/children`. Display only; refetched after every save.
 *
 * Keeping the two in step is the whole job, and getting it wrong corrupts the
 * persisted attribute, so it lives here as plain functions rather than inline
 * in the component.
 *
 * @see https://github.com/Epistemic-Technology/wp-museum/issues/142
 */

import type { ImageSizeTuple } from '../../types';

/**
 * The subset of a child that the editor actually renders.
 *
 * Records reach the block two ways — from `/all/{id}/children` (museum-shaped
 * `MuseumObject`s) and, optimistically, from the WordPress core REST response
 * to creating the post. Those two shapes have almost nothing in common, so the
 * block normalizes both to this narrow record; `MuseumObject` satisfies it
 * structurally.
 */
export interface ChildObjectRecord {
	ID: number;
	post_title: string;
	link?: string | null;
	edit_link?: string | null;
	thumbnail?: ImageSizeTuple | [] | null;
}

/** kind_id → child post IDs. The block's `childObjects` attribute. */
export type ChildObjectIds = Record< string, number[] >;

/** kind_id → child records. The block's `childObjectData` state. */
export type ChildObjectRecords = Record< string, ChildObjectRecord[] >;

/**
 * The parts of a WordPress core REST (`/wp/v2/{post_type}`) create-post
 * response this block reads. Not a wp-museum/v1 wire shape, so it is defined
 * here rather than in src/types.
 */
export interface WPCorePostResponse {
	id: number;
	link?: string;
	title?: { raw?: string; rendered?: string };
	[ key: string ]: unknown;
}

/**
 * Both maps arrive from PHP, where an empty associative array serializes as
 * `[]` rather than `{}`. Normalize that (and null) to an empty object so the
 * callers can just index by kind.
 */
const toMap = < T >( value: Record< string, T > | unknown[] | null | undefined ): Record< string, T > =>
	! value || Array.isArray( value ) ? {} : { ...value };

/**
 * Normalize a freshly created child from the WordPress core REST response into
 * the record shape the editor renders.
 *
 * The core response has none of the museum fields — no `post_title`, no
 * `thumbnail`, and a lowercase `id` — so a raw response rendered as a child
 * shows up blank. `edit_link` and `thumbnail` stay null until the save-driven
 * refetch replaces this record with the museum-shaped one.
 */
export const newChildRecord = ( response: WPCorePostResponse ): ChildObjectRecord => {
	const title = response.title;
	return {
		ID: response.id,
		post_title:
			typeof title?.raw === 'string'
				? title.raw
				: typeof title?.rendered === 'string'
					? title.rendered
					: '',
		link: typeof response.link === 'string' ? response.link : null,
		edit_link: null,
		thumbnail: null,
	};
};

/**
 * Add a child to both maps, returning new copies of each.
 */
export const addChild = (
	ids: ChildObjectIds | unknown[] | null | undefined,
	records: ChildObjectRecords | unknown[] | null | undefined,
	kindId: number,
	record: ChildObjectRecord
): { ids: ChildObjectIds; records: ChildObjectRecords } => {
	const updatedIds = toMap< number[] >( ids );
	const updatedRecords = toMap< ChildObjectRecord[] >( records );

	updatedIds[ kindId ] = [ ...( updatedIds[ kindId ] ?? [] ), record.ID ];
	updatedRecords[ kindId ] = [ ...( updatedRecords[ kindId ] ?? [] ), record ];

	return { ids: updatedIds, records: updatedRecords };
};

/**
 * Remove a child from both maps by post ID, returning new copies of each.
 *
 * Matching is on the post ID because `ids` holds bare numbers. The previous
 * implementation compared `object.id === child.id` — a property present on
 * neither the numeric entries nor the museum-shaped child — so every delete
 * matched index 0 and removed whichever child happened to be first.
 *
 * Returns `null` when the child is not in `ids`, so the caller can leave the
 * attribute (and the post save it triggers) alone.
 */
export const removeChild = (
	ids: ChildObjectIds | unknown[] | null | undefined,
	records: ChildObjectRecords | unknown[] | null | undefined,
	kindId: number,
	childId: number
): { ids: ChildObjectIds; records: ChildObjectRecords } | null => {
	const updatedIds = toMap< number[] >( ids );
	const kindIds = updatedIds[ kindId ];
	if ( ! kindIds ) {
		return null;
	}

	const index = kindIds.findIndex( ( objectId ) => objectId === childId );
	if ( index === -1 ) {
		return null;
	}

	updatedIds[ kindId ] = kindIds.filter( ( _objectId, i ) => i !== index );

	const updatedRecords = toMap< ChildObjectRecord[] >( records );
	if ( updatedRecords[ kindId ] ) {
		updatedRecords[ kindId ] = updatedRecords[ kindId ].filter(
			( record ) => record.ID !== childId
		);
	}

	return { ids: updatedIds, records: updatedRecords };
};
