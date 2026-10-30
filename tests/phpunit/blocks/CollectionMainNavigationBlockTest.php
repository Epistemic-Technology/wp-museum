<?php
/**
 * Tests for the server-rendered collection-main-navigation block and the
 * collection helpers it uses.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Blocks;

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;

/**
 * The block lists collections as real links, nested under their parents.
 */
class CollectionMainNavigationBlockTest extends WP_Museum_Test_Case {

	/**
	 * Create a published collection.
	 *
	 * @param string $title      Title.
	 * @param array  $overrides  Extra post fields.
	 * @return int Post ID.
	 */
	private function collection( string $title, array $overrides = [] ): int {
		return $this->factory->post->create(
			array_merge(
				[
					'post_type'    => 'wpm_collection',
					'post_status'  => 'publish',
					'post_title'   => $title,
					'post_excerpt' => "About $title",
				],
				$overrides
			)
		);
	}

	/**
	 * Render the block.
	 *
	 * @param array $attributes Block attributes.
	 * @return string HTML.
	 */
	private function render( array $attributes = [] ): string {
		$json = empty( $attributes ) ? '' : ' ' . wp_json_encode( $attributes );
		return do_blocks( '<!-- wp:wp-museum/collection-main-navigation-block' . $json . ' /-->' );
	}

	/**
	 * Titles in document order from a navigation render.
	 *
	 * @param string $html Rendered block.
	 * @return string[]
	 */
	private function titles_in_order( string $html ): array {
		preg_match_all( '/class="wpm-collection-main-navigation-collection-box-title">\s*<a[^>]*>([^<]*)<\/a>/', $html, $matches );
		return $matches[1];
	}

	public function test_sort_nests_children_under_parents_in_sorted_order() {
		$parent = $this->collection( 'Instruments', [ 'post_name' => 'instruments' ] );
		$a      = $this->collection( 'Astrolabes', [ 'post_parent' => $parent ] );
		$z      = $this->collection( 'Zithers', [ 'post_parent' => $parent ] );
		$other  = $this->collection( 'Books' );

		$sorted = WPMuseum\sort_collections_for_navigation(
			get_posts( [ 'post_type' => 'wpm_collection', 'posts_per_page' => -1 ] ),
			'Alphabetical',
			'Ascending'
		);

		$this->assertSame(
			[ 'Books', 'Instruments', 'Astrolabes', 'Zithers' ],
			array_map( fn( $i ) => $i['post']->post_title, $sorted )
		);
		$this->assertSame( [ 0, 0, 1, 1 ], array_column( $sorted, 'indent_level' ) );

		$desc = WPMuseum\sort_collections_for_navigation(
			get_posts( [ 'post_type' => 'wpm_collection', 'posts_per_page' => -1 ] ),
			'Alphabetical',
			'Descending'
		);
		$this->assertSame(
			[ 'Instruments', 'Zithers', 'Astrolabes', 'Books' ],
			array_map( fn( $i ) => $i['post']->post_title, $desc )
		);
	}

	public function test_sort_promotes_a_child_whose_parent_is_missing() {
		$missing_parent = $this->collection( 'Hidden parent', [ 'post_status' => 'draft' ] );
		$child          = $this->collection( 'Orphan', [ 'post_parent' => $missing_parent ] );

		$sorted = WPMuseum\sort_collections_for_navigation(
			get_posts( [ 'post_type' => 'wpm_collection', 'post_status' => 'publish', 'posts_per_page' => -1 ] )
		);

		$this->assertCount( 1, $sorted );
		$this->assertSame( 'Orphan', $sorted[0]['post']->post_title );
		$this->assertSame( 0, $sorted[0]['indent_level'] );
	}

	public function test_sort_respects_menu_order_before_title() {
		$this->collection( 'Alpha', [ 'menu_order' => 2 ] );
		$this->collection( 'Beta', [ 'menu_order' => 1 ] );

		$sorted = WPMuseum\sort_collections_for_navigation(
			get_posts( [ 'post_type' => 'wpm_collection', 'posts_per_page' => -1 ] ),
			'Alphabetical',
			'Ascending'
		);
		$this->assertSame( [ 'Beta', 'Alpha' ], array_map( fn( $i ) => $i['post']->post_title, $sorted ) );
	}

	public function test_tag_query_special_slugs() {
		$this->assertNull( WPMuseum\collection_tag_tax_query( [ '_all' ] ) );
		$this->assertNull( WPMuseum\collection_tag_tax_query( [] ) );
		$this->assertNull( WPMuseum\collection_tag_tax_query( [ 'featured', '_all' ] ) );

		$plain = WPMuseum\collection_tag_tax_query( [ 'featured' ] );
		$this->assertSame( [ 'featured' ], $plain[0]['terms'] );
		$this->assertArrayNotHasKey( 'operator', $plain[0] );
	}

	public function test_collections_by_tags_filters_and_untagged() {
		$tagged   = $this->collection( 'Tagged' );
		$untagged = $this->collection( 'Untagged' );
		wp_set_object_terms( $tagged, [ 'featured' ], 'collection_tag' );

		$ids = fn( array $posts ) => array_map( fn( $p ) => $p->ID, $posts );

		$this->assertEqualsCanonicalizing( [ $tagged, $untagged ], $ids( WPMuseum\get_collections_by_tags( [ '_all' ] ) ) );
		$this->assertSame( [ $tagged ], $ids( WPMuseum\get_collections_by_tags( [ 'featured' ] ) ) );
		$this->assertSame( [ $untagged ], $ids( WPMuseum\get_collections_by_tags( [ '_untagged' ] ) ) );
		$this->assertEqualsCanonicalizing( [ $tagged, $untagged ], $ids( WPMuseum\get_collections_by_tags( [ '_untagged', 'featured' ] ) ) );
		$this->assertSame( [], $ids( WPMuseum\get_collections_by_tags( [ 'nonexistent' ] ) ) );
	}

	public function test_block_renders_links_without_a_react_mount() {
		$parent = $this->collection( 'Instruments' );
		$child  = $this->collection( 'Astrolabes', [ 'post_parent' => $parent ] );

		$html = $this->render( [ 'sortOrder' => 'Ascending' ] );

		$this->assertStringContainsString( '<nav aria-label="Collection navigation">', $html );
		$this->assertStringContainsString( 'href="' . get_permalink( $parent ) . '"', $html );
		$this->assertStringContainsString( 'href="' . get_permalink( $child ) . '"', $html );
		$this->assertStringContainsString( 'About Astrolabes', $html );
		$this->assertStringContainsString( 'More about the Astrolabes Collection...', $html );
		$this->assertStringNotContainsString( 'wpm-collection-main-navigation-front', $html );
		$this->assertStringNotContainsString( 'data-attributes', $html );
		$this->assertSame( [ 'Instruments', 'Astrolabes' ], $this->titles_in_order( $html ) );

		// Child is indented by the default 3em per level and marked as such.
		$this->assertMatchesRegularExpression( '/indent-1"\s+style="margin-left:3em"/', $html );
		$this->assertMatchesRegularExpression( '/indent-0"\s+style="margin-left:0em"/', $html );

		// Toggle button is wired for the view script and starts closed.
		$this->assertStringContainsString( 'aria-expanded="false"', $html );
		$this->assertMatchesRegularExpression( '/aria-controls="(wpm-collection-excerpt-\d+)"/', $html );
		preg_match( '/aria-controls="(wpm-collection-excerpt-\d+)"/', $html, $m );
		$this->assertStringContainsString( 'id="' . $m[1] . '"', $html );
	}

	public function test_block_applies_appearance_attributes_only_when_not_default() {
		$this->collection( 'Solo' );

		$default = $this->render();
		$this->assertStringNotContainsString( 'font-size', $default );
		$this->assertStringNotContainsString( 'background-color', $default );

		$styled = $this->render(
			[
				'useDefaultFontSize'        => false,
				'fontSize'                  => 1.5,
				'useDefaultBackgroundColor' => false,
				'backgroundColor'           => '#ff0000',
				'useDefaultBorderWidth'     => false,
				'borderWidth'               => 2,
				'useDefaultVerticalSpacing' => false,
				'verticalSpacing'           => 1,
				'subCollectionIndent'       => 2,
			]
		);
		$this->assertStringContainsString( 'font-size:1.5em', $styled );
		$this->assertStringContainsString( 'background-color:#ff0000', $styled );
		$this->assertStringContainsString( 'border-width:2px;border-style:solid', $styled );
		$this->assertStringContainsString( 'margin-bottom:1em', $styled );
	}

	public function test_block_filters_by_tags() {
		$tagged   = $this->collection( 'Tagged one' );
		$untagged = $this->collection( 'Untagged one' );
		wp_set_object_terms( $tagged, [ 'featured' ], 'collection_tag' );

		$html = $this->render( [ 'tags' => [ 'featured' ] ] );
		$this->assertSame( [ 'Tagged one' ], $this->titles_in_order( $html ) );

		$html = $this->render( [ 'tags' => [ '_untagged' ] ] );
		$this->assertSame( [ 'Untagged one' ], $this->titles_in_order( $html ) );
	}

	public function test_block_escapes_titles() {
		$this->collection( 'Tools <script>alert(1)</script> & things' );

		$html = $this->render();
		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( '&amp; things', $html );
	}

	public function test_block_is_registered_with_a_dependency_free_view_script() {
		$block = \WP_Block_Type_Registry::get_instance()->get_registered( 'wp-museum/collection-main-navigation-block' );
		$this->assertNotNull( $block );
		$this->assertNotEmpty( $block->view_script_handles );
		foreach ( $block->view_script_handles as $handle ) {
			$deps = wp_scripts()->registered[ $handle ]->deps ?? [];
			$this->assertNotContains( 'wp-components', $deps );
			$this->assertNotContains( 'wp-element', $deps );
			$this->assertNotContains( 'react', $deps );
		}
	}
}
