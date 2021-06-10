<?php
/**
 * Trait for controllers that prepare and sanitze responses from schema.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Trait for controllers that prepare and sanitze responses from schema.
 */
trait Preparable_From_Schema {
	/**
	 * Sanitize data based on expected type, based on schema.
	 *
	 * @param string|array|null $data         The data to be sanitized.
	 * @param array             $data_schema  The schema for that data.
	 *   string|array   $data_schema['type']  The expected type or types of the data.
	 *   array          $data_schema['items'] If type is array, then items should contain array of
	 *                                        schema for each item.
	 *
	 * @return string|array|null The sanitized data.
	 */
	private static function sanitize_from_type( $data, $data_schema ) {
		$new_data = [];

		if ( is_array( $data_schema['type'] ) ) {
			$type = $data_schema['type'];
		} else {
			$type = [ $data_schema['type'] ];
		}

		if ( in_array( 'null', $type, true ) && ! $data ) {
			$new_data = null;
		} elseif ( in_array( 'integer', $type, true ) && is_numeric( $data ) ) {
			$new_data = intval( $data );
		} elseif ( in_array( 'number', $type, true ) && is_numeric( $data ) ) {
			$int_version   = intval( $data );
			$float_version = floatval( $data );
			// phpcs:ignore WordPress.PHP.StrictComparisons.LooseComparison
			if ( $int_version == $float_version ) {
				$new_data = $int_version;
			} else {
				$new_data = $float_version;
			}
		} elseif ( in_array( 'array', $type, true ) && is_array( $data ) ) {
			if (
				! is_array( $data_schema['items'] ) ||
				0 === count( $data ) ||
				0 === count( $data_schema['items'] )
			) {
				$new_data = [];
			} else {
				$data_count = count( $data );
				$new_data   = [];
				for ( $data_index = 0; $data_index < $data_count; $data_index++ ) {
					if ( count( $data_schema['items'] ) <= $data_index ) {
						break;
					}
					if ( isset( $data_schema['items'][ $data_index ] ) ) {
						$items_data_schema = $data_schema['items'][ $data_index ];
					} else {
						$items_data_schema = $data_schema['items'];
					}
					$new_data[ $data_index ] = self::sanitize_from_type(
						$data[ $data_index ],
						$items_data_schema
					);
				}
			}
		} elseif ( in_array( 'object', $type, true ) && is_array( $data ) ) {
			$has_property_schema  = false;
			$sanitized_properties = [];
			if (
				isset( $data_schema['properties'] ) &&
				is_array( $data_schema['properties'] )
			) {
				$has_property_schema = true;
				foreach ( $data_schema['properties'] as $property => $property_schema ) {
					if ( ! isset( $data[ $property ] ) ) {
						$new_data[ $property ] = null;
					}
					$new_data[ $property ] = self::sanitize_from_type(
						$data[ $property ],
						$property_schema
					);
					$sanitized_properties[] = $property;
				}
			}
			if (
				isset( $data_schema['additionalProperties'] ) &&
				is_array( $data_schema['additionalProperties'] )
			) {
				$has_property_schema = true;
				foreach ( $data as $data_propterty => $data_item ) {
					if ( in_array( $data_propterty, $sanitized_properties ) ) {
						continue;
					}
					$new_data[ $data_propterty ] = self::sanitize_from_type(
						$data_item,
						$data_schema['additionalProperties']
					);
				}
			}
			if ( ! $has_property_schema ) {
				if ( is_array( $data ) ) {
					$new_data = $data;
				} else {
					$new_data = null;
				}
			}
		} elseif ( in_array( 'string', $type, true ) && is_string( $data ) ) {
			if ( isset( $data_schema['format'] ) ) {
				if ( 'url' === $data_schema['format'] ) {
					$new_data = esc_url( $data );
				} elseif ( 'regex' === $data_schema['format'] ) {
					// Currently just accepting regexs as-is. Probably want to
					// do some sanitization in the future.
					$new_data = $data;
				} else {
					$new_data = sanitize_text_field( $data );
				}
			} else {
				$new_data = sanitize_text_field( $data );
			}
		} elseif ( in_array( 'boolean', $type, true ) ) {
			if ( is_numeric( $data ) ) {
				$new_data = (bool) intval( $data );
			} else {
				$new_data = (bool) $data;
			}
		} else {
			$new_data = null;
		}

		return $new_data;
	}

	/**
	 * Prepares item for response, by checking against schema and sanitizing
	 * appropriately.
	 *
	 * @param Array           $item    Unsanitized item for response.
	 * @param WP_REST_Request $request Request object.
	 * @param Array|null      $schema  Schema against which to sanitize, or null for default schema.
	 *
	 * @return WP_REST_Response Sanitized response object.
	 */
	public function prepare_item_for_response( $item, $request, $schema = null ) {
		$data = [];
		if ( ! $schema ) {
			$schema = $this->get_item_schema();
		}

		$sanitized_properties = [];

		foreach ( $schema['properties'] as $property => $prop_data ) {
			if ( array_key_exists( $property, $item ) ) {
				$data[ $property ]      = self::sanitize_from_type( $item[ $property ], $prop_data );
				$sanitized_properties[] = $property;
			}
		}

		if ( isset( $schema['additionalProperties'] ) ) {
			foreach ( $item as $item_property => $item_data ) {
				if ( in_array( $item_property, $sanitized_properties, true ) ) {
					continue;
				}
				$data [ $item_property ] = self::sanitize_from_type(
					$item_data,
					$schema['additionalProperties']
				);
			}
		}
		return rest_ensure_response( $data );
	}
}
