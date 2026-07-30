/**
 * Typed wrapper around registerBlockType for this plugin's blocks.
 *
 * Every museum block diverges from @wordpress/blocks' BlockConfiguration in
 * the same handful of ways, all of which work at runtime. Rather than casting
 * at each of the fourteen call sites, the divergence is described once here.
 */

/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

import type { ComponentType, ReactElement } from 'react';

/**
 * Block settings as this plugin actually uses them.
 *
 * Differs from BlockConfiguration in four ways, each load-bearing:
 *
 *  1. `icon` may be a plain JSX element. BlockConfiguration admits only a
 *     dashicon slug or an icon descriptor object, but WordPress renders a
 *     React element here without complaint, and every museum block passes
 *     the shared `museum` SVG component.
 *  2. `edit` may type its own attributes precisely. BlockConfiguration
 *     demands `BlockEditProps<Record<string, unknown>>`, which is wider than
 *     every museum block's edit component, so it rejects them all.
 *  3. `title`, `category` and `attributes` are optional. Dynamic blocks
 *     register those server-side from block.json and pass only edit/save.
 *  4. `attributes` values carry a loose `type`. object-image declares
 *     `fontSize` as `'float'`, which is not one of the types the block API
 *     documents — WordPress treats the unknown type as untyped and the
 *     attribute has always round-tripped correctly.
 */
export interface MuseumBlockSettings {
	title?: string;
	icon?: ReactElement | string | { src: ReactElement | string };
	category?: string;
	supports?: Record< string, unknown >;
	attributes?: Record< string, { type: string; default?: unknown } >;
	/**
	 * The block's edit component.
	 *
	 * Accepts class constructors as well as function components because
	 * @wordpress/element bundles its own (React 18) copy of @types/react.
	 * Components extending its `Component` base — object-grid is one — are
	 * therefore structurally incompatible with the project's React 19
	 * `ComponentType`, despite being perfectly valid at runtime.
	 */
	edit: ComponentType< any > | ( new ( ...args: any[] ) => any );
	save?:
		| ComponentType< any >
		| ( new ( ...args: any[] ) => any )
		| ( () => null );
	[ key: string ]: unknown;
}

/**
 * Register a museum block.
 *
 * @param name     Block name, e.g. 'wp-museum/basic-search'.
 * @param settings Block settings.
 */
export function registerMuseumBlock(
	name: string,
	settings: MuseumBlockSettings
) {
	return registerBlockType( name, settings as any );
}
