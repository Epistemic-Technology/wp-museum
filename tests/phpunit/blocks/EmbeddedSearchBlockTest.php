<?php
/**
 * Tests for the server-rendered embedded-search block.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Blocks;

use MikeThicke\WPMuseum\WP_Museum_Test_Case;

/**
 * The block is a plain GET form; these check what it sends and where.
 */
class EmbeddedSearchBlockTest extends WP_Museum_Test_Case {

	/**
	 * Render the block with the given attributes.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Rendered HTML.
	 */
	private function render( array $attributes = [] ): string {
		$json = empty( $attributes ) ? '' : ' ' . wp_json_encode( $attributes );
		return do_blocks( '<!-- wp:wp-museum/embedded-search' . $json . ' /-->' );
	}

	/**
	 * The block is registered and renders without a view script.
	 */
	public function test_block_is_registered_without_a_view_script() {
		$block = \WP_Block_Type_Registry::get_instance()->get_registered( 'wp-museum/embedded-search' );
		$this->assertNotNull( $block );
		$this->assertEmpty( $block->view_script_handles );
	}

	/**
	 * The form submits by GET to the configured search page.
	 */
	public function test_form_targets_the_search_page() {
		$html = $this->render( [ 'searchPageURL' => 'https://example.org/search/' ] );

		$this->assertStringContainsString( '<form', $html );
		$this->assertStringContainsString( 'method="get"', $html );
		$this->assertStringContainsString( 'action="https://example.org/search/"', $html );
		$this->assertStringContainsString( 'name="searchText"', $html );
		$this->assertStringContainsString( 'class="wpm-embedded-search-button is-primary"', $html );
		$this->assertStringNotContainsString( 'data-attributes', $html );
	}

	/**
	 * Query parameters on the search page URL survive the GET submission.
	 */
	public function test_search_page_query_string_is_carried_as_hidden_fields() {
		$html = $this->render( [ 'searchPageURL' => 'https://example.org/?page_id=12' ] );

		$this->assertStringContainsString( 'name="page_id" value="12"', $html );
	}

	/**
	 * Without the toggle, the form still says to search titles only, which is
	 * what the React version sent.
	 */
	public function test_title_toggle_hidden_sends_only_title() {
		$html = $this->render( [ 'searchPageURL' => 'https://example.org/search/' ] );

		$this->assertStringNotContainsString( 'type="checkbox"', $html );
		$this->assertStringContainsString( 'type="hidden" name="onlyTitle" value="1"', $html );
	}

	/**
	 * With the toggle, an unchecked box sends 0 via the hidden field and a
	 * checked box overrides it with 1.
	 */
	public function test_title_toggle_shown_renders_checkbox_with_fallback() {
		$html = $this->render(
			[
				'searchPageURL'   => 'https://example.org/search/',
				'showTitleToggle' => true,
			]
		);

		$this->assertStringContainsString( 'type="hidden" name="onlyTitle" value="0"', $html );
		$this->assertStringContainsString( 'type="checkbox" name="onlyTitle" value="1" checked', $html );
	}

	/**
	 * Header and advanced search link are optional.
	 */
	public function test_optional_header_and_advanced_link() {
		$html = $this->render(
			[
				'searchPageURL'     => 'https://example.org/search/',
				'advancedSearchURL' => 'https://example.org/advanced/',
				'headerText'        => 'Find <em>things</em>',
			]
		);
		$this->assertStringContainsString( '<h2>Find <em>things</em></h2>', $html );
		$this->assertStringContainsString( 'href="https://example.org/advanced/"', $html );

		$html = $this->render(
			[
				'searchPageURL' => 'https://example.org/search/',
				'headerText'    => '',
			]
		);
		$this->assertStringNotContainsString( '<h2>', $html );
		$this->assertStringNotContainsString( 'Advanced Search', $html );
	}

	/**
	 * Attribute values are escaped on the way out.
	 */
	public function test_output_is_escaped() {
		$html = $this->render(
			[
				'searchPageURL' => 'https://example.org/search/" onmouseover="alert(1)',
				'headerText'    => '<script>alert(1)</script>Hi',
			]
		);
		$this->assertStringNotContainsString( 'onmouseover="alert', $html );
		$this->assertStringNotContainsString( '<script>', $html );
	}
}
