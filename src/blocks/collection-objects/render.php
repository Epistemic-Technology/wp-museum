<?php

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$post_id = get_the_ID();
if ( $post_id ) {
	$results_per_page = isset( $attributes['resultsPerPage'] )
		? (int) $attributes['resultsPerPage']
		: 20;
	printf(
		'<div class="wpm-collection-objects-block" data-post-ID="%d" data-results-per-page="%d"></div>',
		(int) $post_id,
		(int) $results_per_page
	);
}
