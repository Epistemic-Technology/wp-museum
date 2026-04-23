<?php
/**
 * A widget that shows a hierarchical list of collections with the current
 * collection indicated.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Singleton class for configuring and displaying widget.
 */
class Collection_Tree_Widget extends \WP_Widget {

	/**
	 * Basic setup of widget.
	 */
	public function __construct() {
		parent::__construct(
			WPM_PREFIX . 'collection_tree_widget',
			'Collection Tree Widget',
			[ 'description' => __( 'Widget for displaying hierarchical list of collections with current collection indicated' ) ]
		);
	}

	/**
	 * Add collection as child collection if parent is in collection list.
	 *
	 * @param WP_Post   $child_collection   Collection to be added.
	 * @param WP_Post[] $parent_collections Array of parent collections.
	 *
	 * @return Boolean true a parent is found for child collection.
	 */
	private static function add_child_collection( $child_collection, &$parent_collections ) {
		foreach ( $parent_collections as $parent ) {
			if ( $child_collection->post_parent === $parent->ID ) {
				if ( isset( $parent->children ) ) {
					$parent->children[] = $child_collection;
				} else {
					$parent->children = [ $child_collection ];
				}
				return true;
			} elseif ( isset( $parent->children ) ) {
				if ( self::add_child_collection( $child_collection, $parent->children ) ) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Create HTML list of child collections of a parent collection.
	 *
	 * @param WP_Post $parent_collection      The collection.
	 * @param int     $current_collection_id  Post ID of the collection currently being displayed.
	 *
	 * @return string HTML list of child collections.
	 */
	private static function child_collection_list_html( $parent_collection, $current_collection_id ) {
		if ( ! isset( $parent_collection->children ) || 0 === count( $parent_collection->children ) ) {
			return '';
		}

		$list_html = '<ul>';

		foreach ( $parent_collection->children as $child_collection ) {
			$list_html .= '<li>';
			if ( $current_collection_id !== $child_collection->ID ) {
				$link       = get_permalink( $child_collection );
				$list_html .= "<a href='$link'>{$child_collection->post_title}</a>";
			} else {
				$list_html .= $child_collection->post_title;
			}
			$list_html .= self::child_collection_list_html( $child_collection, $current_collection_id );
			$list_html .= '</li>';
		}
		$list_html .= '</ul>';

		return $list_html;
	}

	/**
	 * Front-end display of widget.
	 *
	 * @see WP_Widget::widget()
	 *
	 * @param array $args     Widget arguments.
	 * @param array $instance Saved values from database.
	 */
	public function widget( $args, $instance ) {
		$current_post = get_queried_object();

		// Widget is only applicable to museum collections, so just return if not.
		if ( ! $current_post || WPM_PREFIX . 'collection' !== $current_post->post_type ) {
			return;
		}

		$widget_title = false;
		if ( isset( $instance['widget-title'] ) ) {
			$widget_title = $instance['widget-title'];
		}

		$collection_posts = get_posts(
			[
				'post_status'      => 'publish',
				'post_type'        => WPM_PREFIX . 'collection',
				'numberposts'      => -1,
				'suppress_filters' => false,
			]
		);
		if ( ! $collection_posts ) {
			return;
		}

		// Creating sorted hierarchical array of posts, where child collections
		// are sub-arrays of parent collections.
		uasort(
			$collection_posts,
			function ( $a, $b ) {
				return strcmp( $a->post_title, $b->post_title );
			}
		);
		$top_collections = array_filter(
			$collection_posts,
			function ( $a ) {
				return 0 === $a->post_parent;
			}
		);
		$sub_collections = array_filter(
			$collection_posts,
			function ( $a ) {
				return 0 !== $a->post_parent;
			}
		);

		$found_parent          = true;
		$sub_collections_count = count( $sub_collections );
		while ( $sub_collections_count > 0 && $found_parent ) {
			$found_parent = false;
			foreach ( $sub_collections as $sub_collection ) {
				$sub_collection->found_parent = false;
				if ( self::add_child_collection( $sub_collection, $top_collections ) ) {
					$sub_collection->found_parent = true;
					$found_parent                 = true;
				}
			}
			$sub_collections       = array_filter(
				$sub_collections,
				function ( $a ) {
					return false === $a->found_parent;
				}
			);
			$sub_collections_count = count( $sub_collections );
		}

		if ( count( $sub_collections ) > 0 ) {
			$top_collections = array_merge( $top_collections, $sub_collections );
		}

		// Convert sorted list into HTML list.
		$collection_list_html = '<ul>';
		foreach ( $top_collections as $top_collection ) {
			$collection_list_html .= '<li>';
			if ( $current_post->ID !== $top_collection->ID ) {
				$link                  = get_permalink( $top_collection );
				$collection_list_html .= "<a href='$link'>{$top_collection->post_title}</a>";
			} else {
				$collection_list_html .= $top_collection->post_title;
			}
			$collection_list_html .= self::child_collection_list_html( $top_collection, $current_post->ID );
			$collection_list_html .= '</li>';
		}
		$collection_list_html .= '</ul>';

		// Output widget.
		echo wp_kses_post( $args['before_widget'] );
		if ( $widget_title ) {
			?>
			<h3 class='widget_title'><?php echo esc_attr( $widget_title ); ?></h3>
			<?php
		}
		echo wp_kses_post( $collection_list_html );
		echo wp_kses_post( $args['after_widget'] );
	}

	/**
	 * Back-end widget form.
	 *
	 * @see WP_Widget::form()
	 *
	 * @param array $instance Previously saved values from database.
	 */
	public function form( $instance ) {
		if ( isset( $instance['widget-title'] ) ) {
			$widget_title = $instance['widget-title'];
		} else {
			$widget_title = '';
		}

		//phpcs:disable
		?>
		<p>
			<label for="<?= $this->get_field_id('widget-title') ?>">
				<?php _e( 'Title:' ) ?>
			</label>
			<input 
				type='text'
				class='widefat' 
				id='<?= $this->get_field_id('widget-title') ?>' 
				name='<?= $this->get_field_name('widget-title') ?>' 
				value='<?= esc_attr( $widget_title ) ?>' 
			/>
		</p>
		<?php
	}

	/**
	 * Sanitize widget form values as they are saved.
	 *
	 * @see WP_Widget::update()
	 *
	 * @param array $new_instance Values just sent to be saved.
	 * @param array $old_instance Previously saved values from database.
	 *
	 * @return array Updated safe values to be saved.
	 */
	public function update( $new_instance, $old_instance ) {
		$instance                       = [];
		$instance['widget-title']       = esc_attr( $new_instance['widget-title'] );
		return $instance;
	}
}

/**
 * Registers the widget.
 */
function register_collection_tree_widget() {
	register_widget( __NAMESPACE__ . '\Collection_Tree_Widget' );
}