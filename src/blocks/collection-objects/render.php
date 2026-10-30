<?php
/**
 * Collection Objects block: the objects in the current collection, searchable
 * and paginated, rendered in PHP.
 *
 * Search text and page come from the query string (`searchText`, `onlyTitle`,
 * `wpm_page`), so every state has a URL and nothing needs a script. The
 * query goes through prepare_object_search(), the same code the REST search
 * route uses.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$collection_id = get_the_ID();
if ( ! $collection_id ) {
	return;
}

$results_per_page = isset( $attributes['resultsPerPage'] ) ? (int) $attributes['resultsPerPage'] : 20;
if ( 0 === $results_per_page ) {
	$results_per_page = 20;
}

// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only search parameters.
$search_text  = isset( $_GET['searchText'] ) ? sanitize_text_field( wp_unslash( $_GET['searchText'] ) ) : '';
$only_title   = isset( $_GET['onlyTitle'] ) ? rest_sanitize_boolean( sanitize_text_field( wp_unslash( $_GET['onlyTitle'] ) ) ) : true;
$current_page = isset( $_GET['wpm_page'] ) ? max( 1, (int) $_GET['wpm_page'] ) : 1;
// phpcs:enable

$kinds         = get_mobject_kinds();
$object_posts  = [];
$total_objects = 0;
if ( ! empty( $kinds ) ) {
	$object_search = prepare_object_search(
		[
			'selectedCollections' => [ $collection_id ],
			'searchText'          => $search_text,
			'onlyTitle'           => $only_title,
			'per_page'            => $results_per_page,
			'page'                => $current_page,
			'status'              => 'publish',
		],
		$kinds
	);
	$objects_query = new \WP_Query( $object_search['args'] );
	if ( $object_search['where_filter'] ) {
		remove_filter( 'posts_where', $object_search['where_filter'], 10 );
	}
	$object_posts  = $objects_query->posts;
	$total_objects = (int) $objects_query->found_posts;
}

$total_pages  = ( $results_per_page < 0 || 0 === $total_objects ) ? 1 : (int) ceil( $total_objects / $results_per_page );
$current_page = min( $current_page, $total_pages );

$permalink    = get_permalink( $collection_id );
$search_state = [];
if ( '' !== $search_text ) {
	$search_state['searchText'] = $search_text;
	$search_state['onlyTitle']  = $only_title ? '1' : '0';
}
$url_for_page = function ( int $page ) use ( $permalink, $search_state ): string {
	$args = $search_state;
	if ( $page > 1 ) {
		$args['wpm_page'] = $page;
	}
	return empty( $args ) ? $permalink : add_query_arg( $args, $permalink );
};

$wrapper_attributes = get_block_wrapper_attributes(
	[
		'class'                 => 'wpm-collection-objects-block',
		'data-post-id'          => (string) $collection_id,
		'data-results-per-page' => (string) $results_per_page,
	]
);
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>>
	<?php
	echo render_search_form( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped within.
		[
			'action'            => $permalink,
			'search_text'       => $search_text,
			'show_title_toggle' => true,
			'only_title'        => $only_title,
			'reset_url'         => '' !== $search_text ? $permalink : '',
		]
	);
	if ( ! empty( $object_posts ) ) {
		echo render_paginated_object_grid( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped within.
			$object_posts,
			$current_page,
			$total_pages,
			$url_for_page,
			[ 'link_to_objects' => true ]
		);
	} elseif ( '' !== $search_text ) {
		?>
		<p class="wpm-no-results"><?php esc_html_e( 'No objects found.', 'wp-museum' ); ?></p>
		<?php
	}
	?>
</div>
