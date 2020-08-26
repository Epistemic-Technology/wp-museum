
import { 
	useSelect,
	useDispatch
} from '@wordpress/data';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
	InspectorControls,
	RichText
} from '@wordpress/blockEditor';
import { 
	PanelBody,
	CheckboxControl,
	SelectControl,
} from '@wordpress/components';

import { stripslashes } from '../util';


const ObjectMetaField = ( props ) => {
	const {
		fieldData,
		fieldValue,
		errorText,
		onChange,
		onFocus,
		onBlur,
	} = props;

	const {
		help_text : helpText,
		type      : fieldType,
		name      : fieldName,
		public    : isPublic,
		required,
		units,
	} = fieldData;

	// Placeholder
	const detailedInstructions = 'Detailed instructions would be here.'

	const fieldLabel = fieldName + ( required ? '*' : '' );

	const elementFocus = () => {
		onFocus( helpText, detailedInstructions );
	}

	const elementBlur = () => {
		onBlur( fieldData );
	}

	const onDateChange = ( event ) => {
		onChange( event.target.value );
	}

	const onMeasureChange = ( event, dimensionIndex ) => {
		const newFieldValue = [ ...fieldValue ];
		newFieldValue[ dimensionIndex ] = event.target.value;
		onChange( newFieldValue );
	}

	let inputElement;
	if ( fieldType == 'flag' ) {
		inputElement = (
			<CheckboxControl
				checked  = { fieldValue }
				onChange = { onChange }
			/>
		);
	} else if ( fieldType == 'rich' ) {
		inputElement = (
			<RichText
				tagName             = 'p'
				className           = 'object-meta-long-text'
				value               = { fieldValue }
				onChange            = { onChange }
				preserveWhiteSpace
			/>
		);
	} else if ( fieldType == 'plain' ) {
		inputElement = (
			<RichText
				tagName             = 'p'
				className           = 'object-meta-short-text'
				value               = { fieldValue }
				onChange            = { onChange }
				allowedFormats      = { [] } 
				preserveWhiteSpace
			/>
		);
	} else if ( fieldType == 'date') {
		inputElement = (
			<input
				type     = 'date'
				value    = { fieldValue }
				onChange = { onDateChange }
			/>
		);
	}
	else if ( fieldType == 'factor') {
		const factorOptions = fieldData.factors.map( factor => (
			{ 
				label: factor, 
				value: factor
			}
		) );
		inputElement = (
			<SelectControl
				onChange = { onChange}
				value    = { fieldValue }
				options  = { factorOptions }
			/>
		);
	} else if ( fieldType == 'multiple' ) {
		const factorOptions = fieldData.factors.map( factor => (
			{ 
				label: factor, 
				value: factor
			}
		) );
		inputElement = (
			<SelectControl
				multiple
				onChange = { onChange}
				value    = { fieldValue || [] }
				options  = { factorOptions }
			/>
		);
	} else if ( fieldType == 'measure') {
		if ( fieldData.dimensions.n == 1 ) {
			inputElement = (
				<input
					type     = 'number'
					value    = { fieldValue[0] }
					onChange = { ( event ) => onMeasureChange( event, 0 ) }
				/>
			);
		} else {
			const dimensionElements = fieldData.dimensions.labels
				.map( ( dimensionLabel, index ) => (
					<label
						key      = { index }
					>
						<div className = 'input-element-dimension-label'>{ dimensionLabel }</div>
						<input
							type     = 'number'
							value    = { fieldValue[ index ] }
							onChange = { ( event ) => onMeasureChange( event, index ) }
						/>
					</label>
				) );
			inputElement = (
				<div className = 'dimension-elements-input-wrapper'>{ dimensionElements }</div>
			);
		}
	}
	else {
		inputElement = (
			<div>
				{ fieldValue }
			</div>
		);
	}

	const unitLabel = units && fieldType == 'measure' ? ` (${units})` : '';

	return (
		<div className = 'object-meta-row'>
			<div className = 'object-meta-info'>
				<div className = 'object-meta-label'>
					{ fieldLabel }{ unitLabel }
				</div>
				<div className = 'object-meta-private'>{ isPublic ? '' : 'Private'}</div>
			</div>
			<div 
				className = { errorText ? 'object-meta-input has-error' : 'object-meta-input' }
				onFocus   = { elementFocus }
				onBlur    = { elementBlur }
			>
				{ inputElement }
			</div>
			<div className = 'errorMessage'>{ errorText }</div>
		</div>
	); 
}

const ObjectMetaEdit = ( props ) => {
	const { attributes, setAttributes } = props;
	const { fieldErrors } = attributes;

	const [ fieldData, setFieldData ] = useState( null );
	const [ postData, setPostData ] = useState( null );
	const [ currentHelpText, setCurrentHelpText ] = useState( null );
	const [ currentDetailedInstructions, setCurrentDetailedInstructions ] = useState( null );
	const [ catFieldIsGood, setCatFieldIsGood ] = useState( false );

	const { createErrorNotice } = useDispatch( 'core/notices' );
	const { lockPostSaving, unlockPostSaving } = useDispatch( 'core/editor' );

	const { postType, postId, isSavingPost, currentPostStatus } = useSelect( 
		( select ) => {
			const {
				getCurrentPostType,
				getCurrentPostId,
				isSavingPost,
				getEditedPostAttribute,
			} = select( 'core/editor' );
			return {
				postType          : getCurrentPostType(),
				postId            : getCurrentPostId(),
				isSavingPost      : isSavingPost(),
				currentPostStatus : getEditedPostAttribute( 'status' ),
			}
		},
		[]
	);

	const baseRestPath = '/wp-museum/v1';

	if ( ! fieldData ) {
		apiFetch( { path: `${baseRestPath}/${postType}/fields_all` } ).then( result => setFieldData( result ) );
	}

	if ( ! postData ) {
		apiFetch( { path: `${baseRestPath}/all/${postId}` } ).then( result => setPostData( result ) );
	}

	const setFieldAttribute = ( fieldSlug, newVal ) => {
		let setObject = {};
		setObject[ fieldSlug ] = newVal;
		setAttributes( setObject );
	}

	const checkField = ( fieldData ) => {
		const {
			slug         : fieldSlug,
			field_schema : fieldSchema,
			name         : fieldName,
			required,
		} = fieldData;

		const updatedFieldErrors = Object.assign( {}, fieldErrors );

		// clear existing errors
		updatedFieldErrors[ fieldSlug ] = null;

		const fieldValue = attributes[ fieldSlug ];

		if ( required && ! fieldValue ) {
			updatedFieldErrors[ fieldSlug ] = ( <span>Field is required but empty.</span> );
		} else if ( fieldSchema ) {
			const pattern = '^' + stripslashes( fieldSchema ) + '$';
			const regex = new RegExp( pattern );	
			if ( ! regex.test( fieldValue ) ) {
				updatedFieldErrors[ fieldSlug ] = ( <span>Value does not conform to schema.</span> );
			}
		}

		// Check to make sure catalogue ID field is unique.
		if ( postData && fieldValue && postData.cat_field === fieldSlug ) {
			if ( catFieldIsGood ) setCatFieldIsGood( false );
			apiFetch( { path: `${baseRestPath}/all?${fieldSlug}=${fieldValue}` } )
				.then( result => {
					const updatedFieldErrors = Object.assign( {}, fieldErrors );
					let foundError = false;
					if ( Array.isArray( result ) && result.length > 0 ) {
						result.map( objectData => {
							if ( objectData.ID != postId ) {
								foundError = true;
								updatedFieldErrors[ fieldSlug ] = (
									<span>
										{`${fieldName} must be unique, but is already used by `}
										<a href = { objectData.edit_link }>{ objectData.post_title }</a>.
									</span>
								);
							}
						} );
						if ( foundError ) {
							setAttributes( { fieldErrors: updatedFieldErrors } )
						} else {
							if ( ! catFieldIsGood ) setCatFieldIsGood( true );
						}
					}
				}
			);
		}
		setAttributes( { fieldErrors: updatedFieldErrors } );
	}

	const checkAllFields = () => {
		Object.entries( fieldData ).map( field => {
			checkField( field );
		} );
	}

	const onFieldFocus = ( helpText, detailedInstructions ) => {
		setCurrentHelpText( stripslashes( helpText ) );
		setCurrentDetailedInstructions( stripslashes (detailedInstructions ) );
	}

	const onFieldBlur = ( fieldData ) => {
		onFieldFocus( null, null );
		checkField( fieldData );
	}

	if ( isSavingPost ) {
		//checkAllFields();

	}

	const FieldInstructions = ( props ) => {
		const {
			helpText,
			detailedInstructions
		} = props;

		return (
			<>
			{ helpText || detailedInstructions ?
				<InspectorControls>
					<PanelBody
						title = 'Help'
					>
						{ helpText || '' }
					</PanelBody>
					<PanelBody
						title = 'Detailed Instructions'
					>
						{ detailedInstructions || '' }
					</PanelBody>
				</InspectorControls>
				:
				null
			}
			</>
		);
	};
	
	let fields = null;
	if ( fieldData ) {
		fields = Object.entries( fieldData ).map( ( [index, field ] ) => 
			<ObjectMetaField
				key        = { `object-meta-field-${index}`}
				fieldValue = { attributes[ field.slug ] }
				fieldData  = { field }
				onChange   = { ( val ) => setFieldAttribute( field.slug, val ) }
				onFocus    = { onFieldFocus }
				onBlur     = { onFieldBlur }
				errorText  = { fieldErrors && field.slug in fieldErrors && fieldErrors[ field.slug ] }
			/>
		);
	}
	

	return (
		<div className = 'object-meta-block'>
			<h3>Fields</h3>
			<FieldInstructions
				helpText = { currentHelpText }
				detailedInstructions = { currentDetailedInstructions }
			/>
			<div className = 'object-meta-fields-container'>
				{ fields }
			</div>
		</div>
	);
}

export default ObjectMetaEdit;