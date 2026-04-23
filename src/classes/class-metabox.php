<?php
/**
 * Class for WordPress metaboxes.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Class for WordPress metaboxes.
 *
 * @see https://developer.wordpress.org/reference/functions/add_meta_box/
 */
class MetaBox {

	/**
	 * Callback function that displays the metabox.
	 *
	 * @var function $display_callback
	 */
	public $display_callback = null;

	/**
	 * Callback function that saves the metabox.
	 *
	 * @var function $save_callback
	 */
	private $save_callback = null;

	/**
	 * Name/slug for the metabox (lowercase, no spaces).
	 *
	 * @var string $name
	 */
	public $name;

	/**
	 * Label for the metabox.
	 *
	 * @var string $label
	 */
	public $label;

	/**
	 * "The screen or screens on which to show the box (such as a post type, 'link', or 'comment')."
	 *
	 * @link https://developer.wordpress.org/reference/functions/add_meta_box/#parameters
	 *
	 * @var string $screen
	 */
	public $screen = null;

	/**
	 * "The context within the screen where the boxes should display. Available
	 * contexts vary from screen to screen. Post edit screen contexts include
	 * 'normal', 'side', and 'advanced'. Comments screen contexts include
	 * 'normal' and 'side'."
	 *
	 * @link https://developer.wordpress.org/reference/functions/add_meta_box/#parameters
	 *
	 * @var string $context
	 */
	public $context = 'advanced';

	/**
	 * "The priority within the context where the boxes should show ('high', 'low')."
	 *
	 * @link https://developer.wordpress.org/reference/functions/add_meta_box/#parameters
	 *
	 * @var string $priority
	 */
	public $priority = 'default';

	/**
	 * Additional data passed to display callback.
	 *
	 * @link https://developer.wordpress.org/reference/functions/add_meta_box/#parameters
	 *
	 * @var array $args
	 */
	public $args = null;

	/**
	 * New MetaBox.
	 *
	 * @param string   $name Name/slug for the metabox (lowercase, no spaces).
	 * @param string   $label Label for metabox.
	 * @param function $display_callback Function that displays the metabox.
	 * @param function $save_callback Function that is called when post is saved (can be null).
	 */
	public function __construct( $name, $label, $display_callback = null, $save_callback = null ) {
		$this->name             = $name;
		$this->label            = $label;
		$this->display_callback = $display_callback;
		if ( ! is_null( $save_callback ) ) {
			$this->save_callback = $save_callback;
			add_action( 'pre_post_update', $this->save_callback );
		}
	}

	/**
	 * Sets the save callback function.
	 *
	 * @param function $save_callback  A function that will save the metabox data to the database.
	 */
	public function set_save_callback( $save_callback ) {
		if ( ! is_null( $save_callback ) ) {
			$this->save_callback = $save_callback;
			add_action( 'pre_post_update', $this->save_callback );
		}
	}

	/**
	 * Add the metabox.
	 */
	public function add() {
		add_meta_box(
			$this->name,
			$this->label,
			$this->display_callback,
			$this->screen,
			$this->context,
			$this->priority,
			$this->args
		);
	}
}
