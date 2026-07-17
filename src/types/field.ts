/**
 * Types mirroring `MObjectField` (src/classes/class-mobjectfield.php) and the
 * `Object_Fields_Controller` REST routes
 * (src/rest/class-object-fields-controller.php), namespace `wp-museum/v1`.
 */

/**
 * Closed set of custom-field types stored in `wpm_mobject_fields.type`.
 * Source: `MObjectField` docblock and the admin UI
 * (src/admin-react/src/objects/field-edit.js).
 */
export type MObjectFieldType =
	| 'plain'
	| 'rich'
	| 'date'
	| 'factor'
	| 'multiple'
	| 'measure'
	| 'flag'
	| 'links';

/**
 * `dimensions` sub-structure of a measure-type field.
 * Source: `MObjectField::set_dimensions()`.
 *
 * On the wire `n` is `null` when unset OR when stored as 0 (the schema
 * sanitizer maps falsy to null for `integer|null`).
 */
export interface FieldDimensions {
	n: number | null;
	labels: string[];
}

/**
 * A custom-field definition as returned by
 * GET `/wp-museum/v1/{type_name}/fields`.
 * Source: `MObjectField::to_array()` sanitized through
 * `Preparable_From_Schema` in `Object_Fields_Controller`.
 *
 * All 17 keys are always present. Numbers and booleans are genuinely typed
 * on the wire (not numeric strings).
 */
export interface MObjectField {
	/** DB primary key; 0 if the row value was empty. */
	field_id: number;
	/** Derived server-side from `name`; never user-settable. */
	slug: string;
	kind_id: number;
	/** Display label; may be `""`. */
	name: string;
	/** May be `""` for an unconfigured field. */
	type: MObjectFieldType | '';
	display_order: number;
	public: boolean;
	required: boolean;
	quick_browse: boolean;
	help_text: string;
	detailed_instructions: string;
	public_description: string;
	/** Regex source the value must match; may be `""`. */
	field_schema: string;
	/** 0 = no limit (plain/rich only). */
	max_length: number;
	/** `null` when the stored JSON was malformed. Measure fields only. */
	dimensions: FieldDimensions | null;
	/** Measure fields only; may be `""`. */
	units: string;
	/** Factor/multiple fields only; `[]` when unset. */
	factors: string[];
}

/**
 * Response of GET `/wp-museum/v1/{type_name}/fields`: object keyed by
 * field_id (numeric-string keys). GOTCHA: a kind with no visible fields
 * serializes as an empty JSON ARRAY `[]`, not `{}`.
 */
export type ObjectFieldsResponse = Record<string, MObjectField> | [];

/**
 * A single field object in the POST/PUT/PATCH `/wp-museum/v1/{type_name}/fields`
 * request body. Parsed by `MObjectField::from_rest()` — every property is
 * optional with server-side defaults.
 */
export interface MObjectFieldUpdate {
	/** `-1`, absent, or nonexistent id ⇒ INSERT; existing id ⇒ UPDATE. Client also sends `null` for imported fields. */
	field_id?: number | null;
	kind_id?: number;
	/** Slug is derived from this server-side; a submitted `slug` is ignored. */
	name?: string;
	type?: MObjectFieldType | '';
	display_order?: number;
	public?: boolean | 0 | 1;
	required?: boolean | 0 | 1;
	quick_browse?: boolean | 0 | 1;
	help_text?: string;
	detailed_instructions?: string;
	public_description?: string;
	field_schema?: string;
	max_length?: number;
	units?: string;
	factors?: string[] | null;
	/**
	 * Both `n` and `labels` must be present (and `labels` an array) or the
	 * input is ignored. NOTE: the admin UI may send `n` as a numeric string
	 * (from a `<select>`); the server `intval()`s it.
	 */
	dimensions?: { n: number | string | null; labels: string[] };
	/** Strictly `true` ⇒ delete the field instead of saving (needs `field_id` ≥ 0). */
	delete?: boolean;
}

/**
 * Request body of POST/PUT/PATCH `/wp-museum/v1/{type_name}/fields`.
 * Conventionally an object keyed by field_id, but the endpoint also
 * tolerates a plain array (used by kind import in
 * src/admin-react/src/objects/index.js).
 *
 * Response is a bare JSON boolean: `true` if every save succeeded.
 */
export type ObjectFieldsUpdateRequest =
	| Record<string, MObjectFieldUpdate>
	| MObjectFieldUpdate[];
