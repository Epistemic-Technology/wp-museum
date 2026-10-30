<?php
/**
 * Tests for the shared frontend render helpers in display-functions.php.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Includes;

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;

/**
 * Search form, object grid and pagination markup.
 */
class DisplayRenderFunctionsTest extends WP_Museum_Test_Case {

	private function url_for_page(): callable {
		return fn( int $page ) => 'https://example.org/c/?wpm_page=' . $page;
	}

	public function test_pagination_window_matches_the_react_component() {
		// Fewer pages than the window: show them all.
		$this->assertSame( [ 'start' => 1, 'end' => 3 ], WPMuseum\pagination_window( 2, 3 ) );
		// Near the start: first five.
		$this->assertSame( [ 'start' => 1, 'end' => 5 ], WPMuseum\pagination_window( 1, 10 ) );
		$this->assertSame( [ 'start' => 1, 'end' => 5 ], WPMuseum\pagination_window( 4, 10 ) );
		// In the middle: centred.
		$this->assertSame( [ 'start' => 4, 'end' => 8 ], WPMuseum\pagination_window( 6, 10 ) );
		// Near the end: last five.
		$this->assertSame( [ 'start' => 6, 'end' => 10 ], WPMuseum\pagination_window( 9, 10 ) );
		$this->assertSame( [ 'start' => 6, 'end' => 10 ], WPMuseum\pagination_window( 10, 10 ) );
	}

	public function test_pagination_is_empty_for_a_single_page() {
		$this->assertSame( '', WPMuseum\render_pagination( 1, 1, $this->url_for_page() ) );
		$this->assertSame( '', WPMuseum\render_pagination( 1, 0, $this->url_for_page() ) );
	}

	public function test_pagination_renders_links_for_a_short_run() {
		$html = WPMuseum\render_pagination( 1, 2, $this->url_for_page() );

		$this->assertStringContainsString( '<ol aria-label="Pagination Navigation">', $html );
		$this->assertStringContainsString( 'class="page-list-selected"', $html );
		$this->assertStringContainsString( 'aria-current="page"', $html );
		$this->assertStringContainsString( 'href="https://example.org/c/?wpm_page=2" aria-label="Go to page 2"', $html );
		// No first/prev/next/last controls when everything fits.
		$this->assertStringNotContainsString( 'Go to first page', $html );
		$this->assertStringNotContainsString( 'Go to next page', $html );
		$this->assertStringNotContainsString( '<button', $html );
	}

	public function test_pagination_renders_end_controls_and_ellipses_for_a_long_run() {
		$html = WPMuseum\render_pagination( 6, 10, $this->url_for_page() );

		$this->assertStringContainsString( 'aria-label="Go to first page"', $html );
		$this->assertStringContainsString( 'aria-label="Go to previous page"', $html );
		$this->assertStringContainsString( 'aria-label="Go to next page"', $html );
		$this->assertStringContainsString( 'aria-label="Go to last page"', $html );
		$this->assertStringContainsString( 'aria-label="Go to page 1"', $html );
		$this->assertStringContainsString( 'aria-label="Go to page 10"', $html );
		$this->assertSame( 2, substr_count( $html, '<li aria-hidden="true">...</li>' ) );
		$this->assertStringContainsString( 'href="https://example.org/c/?wpm_page=5" aria-label="Go to previous page"', $html );
		$this->assertStringContainsString( 'href="https://example.org/c/?wpm_page=7" aria-label="Go to next page"', $html );

		// On the first page "previous" is disabled rather than a link.
		$first = WPMuseum\render_pagination( 1, 10, $this->url_for_page() );
		$this->assertStringContainsString( '<span aria-disabled="true" aria-label="Go to previous page">', $first );
	}

	public function test_object_grid_renders_boxes_with_links_and_placeholder() {
		$kind    = $this->factory->post->create(
			[
				'post_type'   => 'post',
				'post_title'  => 'Brass sextant',
				'post_status' => 'publish',
			]
		);
		$html    = WPMuseum\render_object_grid( [ get_post( $kind ) ], [ 'columns' => 4 ] );

		$this->assertStringContainsString( '<div class="wpm-object-grid">', $html );
		$this->assertStringContainsString( 'class="object-grid-box-wrapper" style="flex-basis: calc(25% - 10px)"', $html );
		$this->assertStringContainsString( 'href="' . get_permalink( $kind ) . '"', $html );
		$this->assertStringContainsString( '<h3>Brass sextant</h3>', $html );
		$this->assertStringContainsString( 'museum-icon-darkgray-1024.png', $html );

		$unlinked = WPMuseum\render_object_grid( [ get_post( $kind ) ], [ 'link_to_objects' => false, 'display_title' => false ] );
		$this->assertStringNotContainsString( '<a ', $unlinked );
		$this->assertStringNotContainsString( '<h3>', $unlinked );

		$this->assertSame( '', WPMuseum\render_object_grid( [] ) );
	}

	public function test_search_form_prefills_and_carries_state() {
		$html = WPMuseum\render_search_form(
			[
				'action'            => 'https://example.org/?page_id=7',
				'search_text'       => 'a "quoted" term',
				'show_title_toggle' => true,
				'only_title'        => false,
				'reset_url'         => 'https://example.org/?page_id=7',
			]
		);

		$this->assertStringContainsString( 'action="https://example.org/?page_id=7"', $html );
		$this->assertStringContainsString( 'name="page_id" value="7"', $html );
		$this->assertStringContainsString( 'value="a &quot;quoted&quot; term"', $html );
		// Unchecked toggle: hidden 0, checkbox without `checked`.
		$this->assertStringContainsString( 'type="hidden" name="onlyTitle" value="0"', $html );
		$this->assertMatchesRegularExpression( '/type="checkbox" name="onlyTitle" value="1"\s*\/>/', $html );
		$this->assertStringContainsString( 'wpm-embedded-search-reset', $html );

		$hidden = WPMuseum\render_search_form( [ 'only_title' => false ] );
		$this->assertStringContainsString( 'type="hidden" name="onlyTitle" value="0"', $hidden );
		$this->assertStringNotContainsString( 'action=', $hidden );
		$this->assertStringNotContainsString( 'Reset', $hidden );
	}
}
