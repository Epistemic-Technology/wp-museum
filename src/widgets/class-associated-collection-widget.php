<?php
/**
 * A widget that shows collections associated with the currently displayed
 * museum object.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Singleton class for configuring and displaying widget.
 *
 * Instance variables:
 *  - widget-title       String  Title of widget, or '' for no title.
 *  - show-feature-image Boolean Whether to show image in collection boxes.
 *  - show-description   Boolean Whether to show collection description in
 *                               collection boxes.
 */
class Associated_Collection_Widget extends \WP_Widget {

	/**
	 * Basic setup of widget.
	 */
	public function __construct() {
		parent::__construct(
			WPM_PREFIX . 'associated_collection_widget',
			'Associated Collection Widget',
			[ 'description' => __( 'Widget for displaying collections associated with an object in the sidebar.' ) ]
		);
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

		// Widget is only applicable to musuem objects, so just return if not.
		if ( ! $current_post || ! in_array( $current_post->post_type, get_object_type_names(), true ) ) {
			return;
		}

		$widget_title = false;
		if ( isset( $instance['widget-title'] ) ) {
			$widget_title = $instance['widget-title'];
		}

		$collections      = get_object_collections( $current_post->ID );
		$collection_boxes = [];

		foreach ( $collections as $collection ) {
			$featured_image = false;
			if ( $instance['show-feature-image'] ) {
				$featured_image = get_collection_featured_image( $collection->ID );
			}
			$description = false;
			if ( $instance['show-description'] ) {
				$description = get_the_excerpt( $collection );
			}
			$title = $collection->post_title;
			$link  = get_permalink( $collection );
			//phpcs:disable
			ob_start();
			?>
				<div class='wpm-associated-collection'>
					<?php
					if ( $featured_image ) {
						?>
						<a href='<?= $link ?>'>
							<img
								class='wpm-associated-collection-imgage' 
								src='<?= $featured_image[0] ?>' 
								alt='<?= esc_attr( $title ) ?>'
							/>
						</a>
						<?php
					}
					?>
					<a href='<?= $link ?>'>
						<h4><?= $title ?></h4>
					</a>
					<?php
					if ( $description ) {
						?>
						<div class='wpm-associated-collection-excerpt'>
							<a href='<?= $link ?>'>
								<?= $description ?>
							</a>
						</div>
						<?php
					}
					?>
				</div>
			<?php
			//phpcs:enable
			$collection_boxes[] = ob_get_clean();
		}
		echo wp_kses_post( $args['before_widget'] );
		if ( $widget_title ) {
			?>
			<h3 class='widget_title'><?php echo esc_attr( $widget_title ); ?></h3>
			<?php
		}
		foreach ( $collection_boxes as $box ) {
			echo wp_kses_post( $box );
		}
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
		if ( isset( $instance['show-feature-image'] ) ) {
			$show_feature_image = $instance['show-feature-image'];
		} else {
			$show_feature_image = true;
		}
		if ( isset( $instance['show-description'] ) ) {
			$show_description = $instance['show-description'];
		} else {
			$show_description = false;
		}
		//phpcs:disable
		?>
		<p>
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
			<p>
				<input
					type='checkbox' 
					class='checkbox' 
					<?php checked( $show_feature_image, true ) ?> 
					id='<?= $this->get_field_id('show-feature-image') ?>' 
					name='<?= $this->get_field_name('show-feature-image') ?>' 
				/>
				<label for="<?= $this->get_field_id('show-feature-image') ?>">
					<?php _e( 'Show featured image for each associated collection.' ) ?>
				</label>
			</p>
			<p>
				<input
					type='checkbox' 
					class='checkbox' 
					<?php checked( $show_description, true ) ?> 
					id='<?= $this->get_field_id('show-description') ?>' 
					name='<?= $this->get_field_name('show-description') ?>' 
				/>
				<label for="<?= $this->get_field_id('show-description') ?>">
					<?php _e( 'Show description for each associated collection.' ) ?>
				</label>
			</p>

		</p>
		<?php
		//phpcs:enable
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
		$instance['show-feature-image'] = 'on' === $new_instance['show-feature-image'];
		$instance['show-description']   = 'on' === $new_instance['show-description'];
		return $instance;
	}
}

/**
 * Registers the widget.
 *
 * phpcs:disable Universal.Files.SeparateFunctionsFromOO.Mixed
 */
function register_associated_collection_widget() {
	register_widget( __NAMESPACE__ . '\Associated_Collection_Widget' );
}
