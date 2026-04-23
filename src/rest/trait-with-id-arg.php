<?php
/**
 * Trait for controllers with (post) ID arg.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Trait for controllers with (post) ID arg.
 */
trait With_ID_Arg {
	/**
	 * Arguments for ID argument.
	 */
	protected function get_id_arg() {
		return [
			'validate_callback' => function ( $param ) {
				return is_numeric( $param );
			},
			'sanitize_callback' => function ( $param ) {
				return intval( $param );
			},
		];
	}
}
