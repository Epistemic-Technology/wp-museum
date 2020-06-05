<?php
/**
 * Functions for upgrading database.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Upgrades database from version 0.13 to 0.15. Version 0.13 is the live
 * verion on UTSIC in 2018/2019.
 */
function upgrade_0_13_to_0_15() {
	global $wpdb;

	$old_table_name = $wpdb->prefix . WPM_PREFIX . 'object_types';
	$new_table_name = $wpdb->prefix . WPM_PREFIX . 'mobject_kinds';

	$result = $wpdb->query( "ALTER TABLE $old_table_name RENAME TO `$new_table_name`;" );
	$result = $wpdb->query( "ALTER TABLE `$new_table_name` CHANGE `object_id` `kind_id` MEDIUMINT(9) NOT NULL AUTO_INCREMENT;" );

	$object_posts = get_posts(
		[
			'numberposts' => -1,
			'post_type'   => get_object_type_names(),
			'post_status' => 'any',
		]
	);
	foreach ( $object_posts as $object_post ) {
		$custom      = get_post_custom( $object_post->ID );
		if ( ! empty( $custom['description'] ) && empty( $object_post->post_content ) ) {
			$posts_table = $wpdb->prefix . 'posts';
			$query       = "UPDATE $posts_table SET `post_content` = %s WHERE `ID` = %s;";
			$result = $wpdb->query( $wpdb->prepare( $query, $custom['description'][0], $object_post->ID ) );
		}
	}

	$postmeta_table = $wpdb->prefix . 'postmeta';
	$wpdb->query( "DELETE FROM $postmeta_table WHERE meta_key = 'description'" );

	$old_fields_table = $wpdb->prefix . WPM_PREFIX . 'object_fields';
	$new_fields_table = $wpdb->prefix . WPM_PREFIX . 'mobject_fields';
	$wpdb->query( "ALTER TABLE $old_fields_table RENAME TO $new_fields_table ;" );
	$wpdb->query( "ALTER TABLE $new_fields_table CHANGE `object_id` `kind_id` MEDIUMINT(9);");
	$wpdb->query( "DELETE FROM $new_fields_table WHERE `slug` = 'description'" );
}

/**
 * Replace HTML entities in a string while leaving tags in place.
 *
 * @see https://www.php.net/manual/en/function.htmlspecialchars.php#101592
 * @param string $text Text containing potential HTML entities for encoding.
 */
function fixtags( $text ) {
	$text = htmlspecialchars( $text );
	$text = preg_replace( '/=/', '=""', $text );
	$text = preg_replace( '/&quot;/', '&quot;"', $text );

	$tags = '/&lt;(\/|)(\w*)(\ |)(\w*)([\\\=]*)(?|(")"&quot;"|)(?|(.*)?&quot;(")|)([\ ]?)(\/|)&gt;/i';

	$replacement = '<$1$2$3$4$5$6$7$8$9$10>';

	$text = preg_replace( $tags, $replacement, $text );
	$text = preg_replace( '/=""/', '=', $text );
	$text = str_replace( '""', '"', $text );

	return $text;
}

/**
 * Encode HTML entities in meta fields that aren't part of proper tags. Otherwise
 * they can break the RichText component.
 */
function fix_meta_html_entities() {
	$posts = get_posts(
		[
			'numberposts' => -1,
			'post_type'   => get_object_type_names(),
			'post_status' => 'any',
		]
	);
	foreach ( $posts as $object_post ) {
		$custom = get_post_custom( $object_post->ID );
		foreach ( $custom as $meta_key => $meta_value ) {
			$updated_value = $meta_value[0];
			$updated_value = htmlspecialchars( $updated_value );
			$updated_value = str_replace( '&quot;', '"', $updated_value );
			$updated_value = str_replace( '&apos;', "'", $updated_value );
			update_post_meta( $object_post->ID, $meta_key, $updated_value );
		}
	}
}

/**
 * Convert comma-deliniated wpm_gallery_attach_ids meta to array.
 *
 * @see object-functions.php::set_object_image_box_attachments()
 * @see object-functions.php::get_object_image_box_attachments()
 */
function fix_wpm_gallery_attach_ids() {
	$posts = get_posts(
		[
			'numberposts' => -1,
			'post_type'   => get_object_type_names(),
			'post_status' => 'any',
		]
	);
	$exit_after_one = false;
	foreach ( $posts as $object_post ) {
		/**
		 * This code is from the old get_object_image_attachment function, so
		 * it will only work on the old sort order method.
		 */

		$custom = get_post_custom( $object_post->ID );
		if (
			! isset( $custom['wpm_gallery_attach_ids'] ) ||
			! $custom['wpm_gallery_attach_ids'][0] ||
			! is_string( $custom['wpm_gallery_attach_ids'][0] )
		) {
				continue;
		} else {
			$image_pairs_array = explode( ',', $custom['wpm_gallery_attach_ids'][0] );
			$max_order         = 0;
			$attached_image_array = [];
			foreach ( $image_pairs_array as $image_pair_str ) {
				$image_pair_arr = explode( ':', $image_pair_str );
				if ( 2 === count( $image_pair_arr ) ) {
					$attached_image_array[ $image_pair_arr[0] ] = $image_pair_arr[1];
					if ( $image_pair_arr[1] >= $max_order ) {
						$max_order = $image_pair_arr[1];
					}
				} elseif ( 1 === count( $image_pair_arr ) ) {
					$max_order++;
					$attached_image_array[ $image_pair_arr[0] ] = $max_order;
				}
			}
			if ( is_array( $attached_image_array ) && count( $attached_image_array ) > 0 ) {
				asort( $attached_image_array );
				$new_attach_ids = [];
				foreach ( $attached_image_array as $post_id => $sort_order ) {
					$new_attach_ids[] = intval( $post_id );
				}
				$a = 1;
				update_post_meta( $object_post->ID, 'wpm_gallery_attach_ids', $new_attach_ids );
			}
			if ( $exit_after_one ) {
				break;
			}
		}
	}
}

/**
 * Converts wpm_gallery_attach_ids from post_id => sort_order associative array
 * to simple array of post_id in sorted order. This makes it easier to use with
 * REST API.
 */
function make_object_attach_ids_simple_array() {
	$posts = get_posts(
		[
			'numberposts' => -1,
			'post_type'   => get_object_type_names(),
			'post_status' => 'any',
		]
	);
	foreach ( $posts as $object_post ) {
		$attach_ids = get_post_meta( $object_post->ID, 'wpm_gallery_attach_ids', true );
		if ( is_array( $attach_ids ) && count( $attach_ids ) > 0 ) {
			$new_attach_ids = [];
			asort( $attach_ids );
			foreach ( $attach_ids as $post_id => $sort_order ) {
				$new_attach_ids[] = intval( $post_id );
			}
			$a = 1;
			update_post_meta( $object_post->ID, 'wpm_gallery_attach_ids', $new_attach_ids );
		}
	}
}

/**
 * Add meta fields and object image gallery blocks to existing posts, just by
 * adding tags to the post content.
 */
function add_block_template() {
	$posts = get_posts(
		[
			'numberposts' => -1,
			'post_type'   => get_object_type_names(),
			'post_status' => 'any',
		]
	);
	foreach ( $posts as $object_post ) {
		$content = $object_post->post_content;
		if ( ! strpos( $content, 'object-meta-block' ) ) {
			$content .= "\n\n<!-- wp:wp-museum/object-meta-block /-->\n\n<!-- wp:wp-museum/object-image-attachments-block /-->\n";
			wp_update_post(
				[
					'ID'           => $object_post->ID,
					'post_content' => $content,
				]
			);
		}
	}
}

/**
 * Add child object block to existing posts.
 */
function add_child_block() {
	$posts = get_posts(
		[
			'numberposts' => -1,
			'post_type'   => get_object_type_names(),
			'post_status' => 'any',
		]
	);
	foreach ( $posts as $object_post ) {
		$content = $object_post->post_content;
		if ( ! strpos( $content, 'child-objects-block' ) ) {
			$content .= "\n\n<!-- wp:wp-museum/child-objects-block /-->\n";
			wp_update_post(
				[
					'ID'           => $object_post->ID,
					'post_content' => $content,
				]
			);
		}
	}
}

/**
 * Translates old field types ( varchar, text, tinyint ) to new ( plain, rich, flag ).
 */
function translate_field_types() {
	global $wpdb;
	$table_name = $wpdb->prefix . WPM_PREFIX . 'mobject_fields';
	$wpdb->update( $table_name, [ 'type' => 'plain' ], [ 'type' => 'varchar' ] );
	$wpdb->update( $table_name, [ 'type' => 'rich' ], [ 'type' => 'text' ] );
	$wpdb->update( $table_name, [ 'type' => 'flag' ], [ 'type' => 'tinyint' ] );
}
//add_action( 'plugins_loaded', __NAMESPACE__ . '\add_child_block' );
//add_action( 'plugins_loaded', __NAMESPACE__ . '\translate_field_types' );
//add_action( 'plugins_loaded', __NAMESPACE__ . '\add_block_template' );
// add_action( 'plugins_loaded', __NAMESPACE__ . '\make_object_attach_ids_simple_array' );
// add_action( 'plugins_loaded', __NAMESPACE__ . '\fix_wpm_gallery_attach_ids' );

