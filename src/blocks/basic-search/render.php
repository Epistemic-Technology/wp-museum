<?php
/**
 * Basic Search block: a search form and a paginated grid of matching objects,
 * rendered in PHP.
 *
 * The search text, title-only toggle and page come from the query string
 * (`searchText`, `onlyTitle`, `wpm_page`), so the form is a plain GET form,
 * every result page has a URL, and the embedded-search block can send a
 * visitor here with a term already filled in. The query goes through
 * prepare_object_search(), the same code the REST search route uses.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$results_per_page = isset( $attributes['resultsPerPage'] ) ? (int) $attributes['resultsPerPage'] : 20;
if ( 0 === $results_per_page ) {
	$results_per_page = 20;
}
$columns              = isset( $attributes['columns'] ) ? max( 1, (int) $attributes['columns'] ) : 4;
$advanced_search_link = isset( $attributes['advancedSearchLink'] ) ? trim( (string) $attributes['advancedSearchLink'] ) : '';

// The attribute is the fallback when the page is opened without a query string.
$search_text  = isset( $attributes['searchText'] ) ? sanitize_text_field( (string) $attributes['searchText'] ) : '';
$only_title   = true;
$current_page = 1;

// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only search parameters.
if ( isset( $_GET['searchText'] ) ) {
	$search_text = sanitize_text_field( wp_unslash( $_GET['searchText'] ) );
}
if ( isset( $_GET['onlyTitle'] ) ) {
	// Arrives as "0"/"1" (the search forms) or "true"/"false" (older links);
	// "false" would be truthy as a string.
	$only_title = rest_sanitize_boolean( sanitize_text_field( wp_unslash( $_GET['onlyTitle'] ) ) );
}
if ( isset( $_GET['wpm_page'] ) ) {
	$current_page = max( 1, (int) $_GET['wpm_page'] );
}
// phpcs:enable

$object_posts  = [];
$total_objects = 0;
if ( '' !== $search_text ) {
	$kinds = get_mobject_kinds();
	if ( ! empty( $kinds ) ) {
		$object_search = prepare_object_search(
			[
				'searchText' => $search_text,
				'onlyTitle'  => $only_title,
				'per_page'   => $results_per_page,
				'page'       => $current_page,
				'status'     => 'publish',
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
}

$total_pages  = ( $results_per_page < 0 || 0 === $total_objects ) ? 1 : (int) ceil( $total_objects / $results_per_page );
$current_page = min( $current_page, $total_pages );

// The page the block is on; outside a singular post (eg. a template part)
// fall back to the current URL without the search parameters.
$page_url = get_permalink();
if ( ! $page_url ) {
	$page_url = remove_query_arg( [ 'searchText', 'onlyTitle', 'wpm_page' ] );
}

$search_state = [];
if ( '' !== $search_text ) {
	$search_state['searchText'] = $search_text;
	$search_state['onlyTitle']  = $only_title ? '1' : '0';
}
$url_for_page = function ( int $page ) use ( $page_url, $search_state ): string {
	$args = $search_state;
	if ( $page > 1 ) {
		$args['wpm_page'] = $page;
	}
	return empty( $args ) ? $page_url : add_query_arg( $args, $page_url );
};

$advanced_search_url = '';
if ( '' !== $advanced_search_link ) {
	$advanced_search_url = '' !== $search_text
		? add_query_arg( 'searchText', $search_text, $advanced_search_link )
		: $advanced_search_link;
}

$wrapper_attributes = get_block_wrapper_attributes( [ 'class' => 'wpm-basic-search-block' ] );
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>>
	<?php
	echo render_search_form( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped within.
		[
			'action'              => $page_url,
			'search_text'         => $search_text,
			'show_title_toggle'   => true,
			'only_title'          => $only_title,
			'advanced_search_url' => $advanced_search_url,
		]
	);
	if ( ! empty( $object_posts ) ) {
		echo render_paginated_object_grid( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped within.
			$object_posts,
			$current_page,
			$total_pages,
			$url_for_page,
			[
				'columns'         => $columns,
				'link_to_objects' => true,
			]
		);
	} elseif ( '' !== $search_text ) {
		?>
		<p class="wpm-no-results"><?php esc_html_e( 'No objects found.', 'wp-museum' ); ?></p>
		<?php
	}
	?>
</div>
