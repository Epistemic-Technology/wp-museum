<?php
/**
 * Exhibit custom post type.
 *
 * Each exhibit is associated with a category, and links to the pages of that category. Exhibits are
 * hierarchical, with parent exhibits linking to child exhibits.
 *
 * ===Custom Fields===
 *   * description          - a short description of the exhibit
 *   * associated_category  - category containing objects to be displayed in exhibit
 *   * layout -
 *          * manual: acts as a normal post
 *          * icons: sub exhibits displayed as grid of icons with titles
 *          * list: sub exhibits displayed as list with title, thumbnail, description
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

require_once 'CustomPostType.php';
require_once 'MetaBox.php';

$exhibit_options   = [
	'type'         => 'exhibit',
	'label'        => 'Exhibit',
	'label_plural' => 'Exhibits',
	'description'  => 'A museum exhibit that guides readers through a set of related posts and objects.',
	'menu_icon'    => 'dashicons-location-alt',
	'hierarchical' => true,
	'options'      => [
		'capabilities' => [
			'edit_posts'           => WPM_PREFIX . 'edit_exhibits',
			'edit_others_posts'    => WPM_PREFIX . 'edit_others_exhibits',
			'publish_posts'        => WPM_PREFIX . 'publish_exhibits',
			'read_private_posts'   => WPM_PREFIX . 'read_private_exhibits',
			'delete_posts'         => WPM_PREFIX . 'delete_exhibits',
			'edit_published_posts' => WPM_PREFIX . 'edit_published_exhibits',
		],
		'map_meta_cap' => true,
	],
];
$exhibit_post_type = new CustomPostType( $exhibit_options );
$exhibit_post_type->add_support( [ 'thumbnail', 'revisions' ] );
$exhibit_post_type->add_taxonomy( 'category' );

/*
 * Custom Fields
 */

$exhibit_post_type->add_meta_field( 'description', 'Description', 'textarea' );

$categories       = get_categories( array( 'hide_empty' => false ) );
$category_options = [ -1 => '' ];
foreach ( $categories as $category ) {
	$category_options[ $category->cat_ID ] = $category->name;
}
$exhibit_post_type->add_meta_field( 'associated_category', 'Associated Category', 'select', $options = [ 'options' => $category_options ] );

$layout_options = [
	'manual' => 'Manual',
	'icons'  => 'Icon grid',
	'list'   => 'List',
];
$exhibit_post_type->add_meta_field( 'layout', 'Exhibit Layout', 'radio', $options = [ 'options' => $layout_options ] );

/*
 * Metaboxes
 */

// Metabox showing exhibit children of current exhibit, with view and edit links.
// Button "New Sub Exhibit" creates a new exhibit as a child, then redirects to edit page
// for new exhibit.
$display_sub_exhibits_cb = function () {
	global $post;
	$sub_exhibits = get_children(
		[
			'numberposts' => -1,
			'post_status' => 'any',
			'post_type'   => 'exhibit',
			'post_parent' => $post->ID,
		]
	);
	echo "<table class='wp-list-table widefat striped'>";
	foreach ( $sub_exhibits as $se ) {
		$permalink = get_permalink( $se->ID );
		$ps        = get_post_status_object( $se->post_status )->label;
		echo wp_kses_post(
			"<tr>
                <td>{$se->post_title}</td>
                <td><a href='post.php?post={$se->ID}&action=edit'>Edit</a></td>
                <td><a href='{$permalink}'>View</a></td>
                <td>{$ps}</td>
            </tr>"
		);
	}
	echo '</table><br />';
	echo wp_kses_post( "<button type='button' class='button button-large' onclick='new_SE({$post->ID})'>New Sub Exhibit</button>" );
};
$children_box            = new MetaBox( 'sub_exhibits', __( 'Sub Exhibits' ), $display_sub_exhibits_cb );
$exhibit_post_type->add_custom_meta( $children_box );


// Metabox showing objects (everything except exhibits) in associated directory, with view
// and edit links.
$display_associated_objects = function () {
	global $post;
	$post_custom = get_post_custom( $post->ID );
	if ( ! isset( $post_custom['associated_category'] ) ) {
		return;
	}

	$exhibit_objects = get_posts(
		[
			'category__in' => $post_custom['associated_category'],
			'numberposts'  => -1,
			'post_status'  => 'any',
		]
	);
	echo "<table class='wp-list-table widefat striped'>";
	foreach ( $exhibit_objects as $ed ) {
		if ( 'exhibit' === $ed->post_type ) {
			continue;
		}
		$permalink = get_permalink( $ed->ID );
		$ps        = get_post_status_object( $ed->post_status )->label;
		echo wp_kses_post(
			"<tr>
                <td>{$ed->post_title}</td>
                <td><a href='post.php?post={$ed->ID}&action=edit'>Edit</a></td>
                <td><a href='{$permalink}'>View</a></td>
                <td>{$ps}</td>
            </tr>"
		);
	}
	echo '</table>';
};
$associated_objects_box     = new MetaBox( 'exhibit_objects', __( 'Objects' ), $display_associated_objects );
$exhibit_post_type->add_custom_meta( $associated_objects_box );


/**
 * Creating new sub exhibit.
 *
 * Javascript for creating new sub exhibit when "New Sub Exhibit" button is clicked.
 * Initiates AJAX call, then redirects to new sub exhibit.
 */
function new_sub_exhibit_js() {
	$nonce = wp_create_nonce( 'create_new_se' );
	?>
	<script type="text/javascript">
		function new_SE(parent_exhibit) {
			var data = {
				'action'    : 'create_new_se',
				'parent'    : parent_exhibit,
				'nonce'     : '<?php echo $nonce; //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>'
			};
			
			jQuery.post(ajaxurl, data, function(response) {
				window.location.href = "post.php?post=" + response +"&action=edit";
			});
		}
	</script> 
	<?php
}
add_action( 'admin_footer', 'new_sub_exhibit_js' );

/**
 * AJAX callback for creating new sub exhibit.
 */
function create_new_se() {
	if ( ! check_ajax_referer( 'create_new_se', 'nonce' ) ) {
		wp_die( 'Security check' );
	}
	$parent_id = intval( $_POST['parent'] );
	$category  = get_post_custom( $parent_id )['associated_category'];
	$args      = [
		'post_title'    => '',
		'post_content'  => '',
		'post_type'     => 'exhibit',
		'post_parent'   => $parent_id,
		'post_category' => $category,
	];
	$post_id   = wp_insert_post( $args );
	echo intval( $post_id );
	wp_die();
}
add_action( 'wp_ajax_create_new_se', 'create_new_se' );

/*
 * Registers exhibit post type. This should be called after settings, callbacks, etc. already added.
 */
$exhibit_post_type->register();

/**
 * Box at top of edit page showing exhibit's parent, if one exists, along with edit link.
 *
 * @param \WP_POST $post The child exhibit.
 */
function add_parent_link( \WP_POST $post ) {
	if ( 'exhibit' !== $post->post_type ) {
		return;
	}
	$parent_id = wp_get_post_parent_ID( $post->ID );
	if ( ! $parent_id ) {
		return;
	}
	$parent = get_post( $parent_id );
	if ( isset( $parent ) ) {
		echo \wp_kses_post( "<div class='postbox' style='font-size:1.2em; padding:10px; margin-bottom:10px;'>Parent Exhibit: {$parent->post_title} (<a href='post.php?post={$parent->ID}&action=edit'>Edit</a>)</div>" );
	}
}
add_action( 'edit_form_top', 'add_parent_link' );

