/**
 * WordPress dependencies
 */
import {
	useState,
	useEffect
} from '@wordpress/element';

import {
	InspectorControls,
	useBlockProps
} from '@wordpress/block-editor';

import {
	CheckboxControl,
	ColorPicker,
	PanelBody,
	TextControl,
} from '@wordpress/components';

import apiFetch from '@wordpress/api-fetch';

import {
	__
} from  '@wordpress/i18n';

/**
 * Internal dependencies
 */

import {
	baseRestPath,
	wordPressRestBase,
	isEmpty
} from '../../javascript/util';

import { CollectionMainNavigation } from '../../components';

import type { Collection } from '../../types';

/**
 * Attributes of the collection-main-navigation block. The block is dynamic,
 * so attributes are defined server-side (see block.json).
 */
export interface CollectionMainNavigationBlockAttributes {
	fontSize: number;
	fontColor: string;
	backgroundColor: string;
	borderColor: string;
	borderWidth: number;
	verticalSpacing: number;
	useDefaultFontSize: boolean;
	useDefaultFontColor: boolean;
	useDefaultBackgroundColor: boolean;
	useDefaultBorderColor: boolean;
	useDefaultBorderWidth: boolean;
	useDefaultVerticalSpacing: boolean;
	subCollectionIndent: number;
	sortBy: string;
	sortOrder: string;
	tags: string[];
}

/**
 * Minimal shape of a WP core taxonomy term as returned from
 * /wp/v2/collection_tag.
 */
interface CollectionTagTerm {
	slug: string;
	name: string;
}

interface CollectionMainNavigationEditProps {
	attributes: CollectionMainNavigationBlockAttributes;
	setAttributes: ( attributes: Partial<CollectionMainNavigationBlockAttributes> ) => void;
}

// TODO(ts-migration): ColorPicker's current types don't accept the `disabled`
// prop this block has always passed, and the deprecated onChangeComplete
// callback's argument is typed as string | LegacyColor-object while runtime
// always receives the object form with `.hex`. Cast to `any` to preserve
// current behavior.
const ColorPickerUntyped = ColorPicker as any;

const CollectionMainNavigationEdit = ( props: CollectionMainNavigationEditProps ) => {
	const {
		attributes,
		setAttributes
	} = props;

	const {
		fontSize,
		fontColor,
		backgroundColor,
		borderColor,
		borderWidth,
		verticalSpacing,
		useDefaultFontSize,
		useDefaultFontColor,
		useDefaultBackgroundColor,
		useDefaultBorderColor,
		useDefaultBorderWidth,
		useDefaultVerticalSpacing,
		subCollectionIndent,
		tags,
	} = attributes;

	// State is initialized to an empty object placeholder (not an array);
	// CollectionMainNavigation's isEmpty() check handles it at runtime.
	const [ collectionData, setCollectionData ] = useState< Collection[] >( {} as unknown as Collection[] );
	const [ tagList, setTagList ] = useState< Record<string, string> >( {} );

	useEffect( () => {
		updateCollectionData();
	}, [ tags ] );

	useEffect( () => {
		updateTagList();
	}, [] );

	const updateCollectionData = () => {
		let collectionPath = `${baseRestPath}/collections`;
		if ( tags.length > 0 ) {
			const tagsString = tags.join();
			collectionPath += `/?tags=${tagsString}`
		}
		apiFetch<Collection[]>( { path: collectionPath } ).then( result => setCollectionData( result ) );
	}

	const updateTagList = () => {
		apiFetch<CollectionTagTerm[]>( { path: `${wordPressRestBase}/collection_tag`} )
			.then( result => {
				if ( Array.isArray( result ) ) {
					const newTagList: Record<string, string> = {};
					result.forEach( taxItem => {
						newTagList[ taxItem.slug ] = taxItem.name;
					} );
					setTagList( newTagList );
				}
			} );
	}

	const tagChecked = ( tagSlug: string ) => tags.includes( tagSlug );
	const allTagChecked = () => tags.includes( '_all' );

	const checkTag = ( tagSlug: string, isChecked: boolean ) => {
		const newTags = tags.filter( tag => tag !== tagSlug );
		if ( isChecked ) {
			newTags.push( tagSlug );
		}
		setAttributes( {
			tags: newTags
		} );
	}

	const tagCheckboxes = [
		<CheckboxControl
			key      = 'tag-checkboxes-_all'
			label    = { __('All') }
			checked  = { tagChecked( '_all') }
			onChange = { isChecked => checkTag( '_all', isChecked ) }
		/>,
		<CheckboxControl
			key      = 'tag-checkboxes-_untagged'
			label    = { __('Untagged') }
			checked  = { tagChecked( '_untagged' ) }
			onChange = { isChecked => checkTag( '_untagged', isChecked ) }
			disabled = { allTagChecked() }
		/>
	];

	if ( ! isEmpty( tagList ) ) {
		Object.entries( tagList ).forEach( ( [ tagSlug, tagLabel ] ) => {
			tagCheckboxes.push(
				<CheckboxControl
					key      = { `tag-checkboxes-${tagSlug}` }
					label    = { tagLabel }
					checked  = { tagChecked( tagSlug ) }
					onChange = { isChecked => checkTag( tagSlug, isChecked ) }
					disabled = { allTagChecked() }
				/>
			);
		} );
	}



	return (
		<>
			<InspectorControls>
				<PanelBody
					title = { __( 'Tags' ) }
				>
					{ tagCheckboxes }
				</PanelBody>
				<PanelBody
					title = { __( 'Appearance' ) }
				>
					<CheckboxControl
						label    = { __( 'Default font size' ) }
						checked  = { useDefaultFontSize }
						onChange = { isChecked => setAttributes( { useDefaultFontSize: isChecked } ) }
					/>
					<TextControl
						type     = 'number'
						label    = { __( 'Font Size (em)' ) }
						value    = { fontSize || '' }
						min      = { 0.1 }
						max      = { 10 }
						disabled = { useDefaultFontSize }
						onChange = { val => setAttributes( { fontSize: parseFloat( val ) } ) }
					/>
					<p>{ __( 'Font Color' ) }</p>
					<CheckboxControl
						label    = { __( 'Default font color' ) }
						checked  = { useDefaultFontColor }
						onChange = { isChecked => setAttributes( { useDefaultFontColor: isChecked } ) }
					/>
					<ColorPickerUntyped
						disabled         = { useDefaultFontColor }
						color            = { fontColor }
						onChangeComplete = { ( val: { hex: string } ) => setAttributes( { fontColor: val.hex } ) }
					/>
					<p>{ __( 'Background Color' ) }</p>
					<CheckboxControl
						label    = { __( 'Default background color' ) }
						checked  = { useDefaultBackgroundColor }
						onChange = { isChecked => setAttributes( { useDefaultBackgroundColor: isChecked } ) }
					/>
					<ColorPickerUntyped
						disabled = { useDefaultBackgroundColor }
						color = { backgroundColor }
						onChangeComplete = { ( val: { hex: string } ) => setAttributes( { backgroundColor: val.hex } ) }
					/>
					<p>{ __( 'Border Color' ) }</p>
					<CheckboxControl
						label    = { __( 'Default border color' ) }
						checked  = { useDefaultBorderColor }
						onChange = { isChecked => setAttributes( { useDefaultBorderColor: isChecked } ) }
					/>
					<ColorPickerUntyped
						disabled         = { useDefaultBorderColor }
						color            = { borderColor }
						onChangeComplete = { ( val: { hex: string } ) => setAttributes( { borderColor: val.hex } ) }
					/>
					<CheckboxControl
						label    = { __( 'Default border width' ) }
						checked  = { useDefaultBorderWidth }
						onChange = { isChecked => setAttributes( { useDefaultBorderWidth: isChecked } ) }
					/>
					<TextControl
						disabled = { useDefaultBorderWidth }
						type     = 'number'
						label    = { __( 'Border Width (px)' ) }
						value    = { borderWidth || '' }
						min      = { 0.1 }
						max      = { 10 }
						onChange = { val => setAttributes( { borderWidth: parseFloat( val ) } ) }
					/>
					<CheckboxControl
						label    = { __( 'Default vertical spacing' ) }
						checked  = { useDefaultVerticalSpacing }
						onChange = { isChecked => setAttributes( { useDefaultVerticalSpacing: isChecked } ) }
					/>
					<TextControl
						disabled = { useDefaultVerticalSpacing }
						type     = 'number'
						label    = { __( 'Vertical Spacing (em)' ) }
						value    = { verticalSpacing || '' }
						min      = { 0 }
						max      = { 3 }
						onChange = { val => setAttributes( { verticalSpacing: parseFloat( val ) } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps() }>
				<CollectionMainNavigation
					attributes     = { attributes }
					collectionData = { collectionData }
				/>
			</div>
		</>
	);
}

export default CollectionMainNavigationEdit;
