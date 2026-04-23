<?php

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

$post_id = get_the_ID();
if ( $post_id ) {
	printf(
		'<div class="wpm-collection-objects-block" data-post-ID="%d"></div>',
		(int) $post_id
	);
}

