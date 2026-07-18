/**
 * A block for Museum Object image attachments.
 */

 /**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import edit from './edit';
import { museum } from '../../icons';


registerBlockType( 'wp-museum/object-image-attachments-block', {
	title : __( 'Object Image Attachments' ),
	// TODO(ts-migration): registerBlockType's types only accept a dashicon
	// string or an icon descriptor with `src`; passing a bare JSX element
	// works at runtime, so cast to keep current behavior.
	icon : museum as any,
	category : 'wp-museum',
	// TODO(ts-migration): edit's typed props (attributes as
	// ObjectImageAttachmentAttributes) are narrower than the generic
	// BlockEditProps<Record<string, unknown>> the types expect; cast
	// preserves current behavior.
	edit : edit as any,
	save : () => null
} );
