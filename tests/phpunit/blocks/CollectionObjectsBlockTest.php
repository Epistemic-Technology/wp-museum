<?php
/**
 * Tests for the server-rendered collection-objects block.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Blocks;

require_once dirname( __DIR__ ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;
use MuseumTestData;

/**
 * The block lists a collection's objects as a grid with pagination links and
 * a GET search form.
 */
class CollectionObjectsBlockTest extends WP_Museum_Test_Case {

	/**
	 * @var array
	 */
	private $test_data;

	public function setUp(): void {
		parent::setUp();
		WPMuseum\db_version_check();
		$this->test_data = MuseumTestData::setup_complete_test_environment( $this->factory );
		WPMuseum\create_mobject_post_types();
		WPMuseum\register_collection_taxonomy();
		foreach ( WPMuseum\get_object_type_names() as $type_name ) {
			if ( ! post_type_exists( $type_name ) ) {
				register_post_type( $type_name, [ 'public' => true ] );
			}
		}
		wp_cache_flush();
	}

	public function tearDown(): void {
		foreach ( WPMuseum\get_object_type_names() as $type_name ) {
			if ( post_type_exists( $type_name ) ) {
				unregister_post_type( $type_name );
			}
		}
		unset( $_GET['searchText'], $_GET['onlyTitle'], $_GET['wpm_page'] );
		parent::tearDown();
	}

	private function render( array $attributes = [] ): string {
		$json = empty( $attributes ) ? '' : ' ' . wp_json_encode( $attributes );
		return do_blocks( '<!-- wp:wp-museum/collection-objects' . $json . ' /-->' );
	}

	/**
	 * Add $count published objects to the test collection.
	 *
	 * @return int[] Post IDs.
	 */
	private function add_objects( int $count, string $prefix = 'Grid object' ): array {
		$ids = [];
		for ( $i = 1; $i <= $count; $i++ ) {
			$id = $this->factory->post->create(
				[
					'post_type'   => 'wpm_instrument',
					'post_status' => 'publish',
					'post_title'  => sprintf( '%s %02d', $prefix, $i ),
				]
			);
			MuseumTestData::add_object_to_collection( $id, $this->test_data['collection']->ID );
			$ids[] = $id;
		}
		return $ids;
	}

	private function on_collection_page(): void {
		$this->go_to( get_permalink( $this->test_data['collection'] ) );
	}

	public function test_renders_grid_with_the_collections_objects_and_no_script_hooks() {
		$this->on_collection_page();
		$html = $this->render();

		$telescope = $this->test_data['telescope'];
		$this->assertStringContainsString( 'wpm-collection-objects-block', $html );
		$this->assertStringContainsString( 'data-results-per-page="20"', $html );
		$this->assertStringContainsString( '<div class="wpm-object-grid">', $html );
		$this->assertStringContainsString( 'href="' . get_permalink( $telescope ) . '"', $html );
		$this->assertStringContainsString( '<form', $html );
		$this->assertStringNotContainsString( 'data-post-ID=', $html );

		$block = \WP_Block_Type_Registry::get_instance()->get_registered( 'wp-museum/collection-objects' );
		$this->assertEmpty( $block->view_script_handles );
	}

	public function test_paginates_with_links_and_reads_wpm_page() {
		$this->add_objects( 25 );
		$this->on_collection_page();

		$first = $this->render();
		$this->assertSame( 20, substr_count( $first, 'class="object-grid-box-wrapper"' ) );
		$this->assertStringContainsString( 'aria-label="Go to page 2"', $first );
		$this->assertStringNotContainsString( 'aria-label="Go to page 3"', $first );
		$this->assertStringContainsString( 'wpm_page=2', $first );
		// Both controls, above and below the grid.
		$this->assertSame( 2, substr_count( $first, '<div class="pagination">' ) );

		$_GET['wpm_page'] = '2';
		$second           = $this->render();
		// 2 fixture objects + 25 = 27; page two holds 7.
		$this->assertSame( 7, substr_count( $second, 'class="object-grid-box-wrapper"' ) );
		$this->assertStringContainsString( 'class="page-list-selected"', $second );
		$this->assertMatchesRegularExpression( '/<li class="page-list-selected">\s*<a href="[^"]*wpm_page=2"/', $second );
	}

	public function test_unlimited_results_show_everything_without_pagination() {
		$this->add_objects( 25 );
		$this->on_collection_page();

		$html = $this->render( [ 'resultsPerPage' => -1 ] );
		$this->assertSame( 27, substr_count( $html, 'class="object-grid-box-wrapper"' ) );
		$this->assertStringNotContainsString( '<div class="pagination">', $html );
		$this->assertStringContainsString( 'data-results-per-page="-1"', $html );
	}

	public function test_search_narrows_results_and_is_carried_in_page_links() {
		$this->add_objects( 22, 'Needle' );
		$this->add_objects( 3, 'Haystack' );
		$this->on_collection_page();

		$_GET['searchText'] = 'Needle';
		$_GET['onlyTitle']  = '1';
		$html               = $this->render();

		$this->assertSame( 20, substr_count( $html, 'class="object-grid-box-wrapper"' ) );
		$this->assertStringNotContainsString( 'Haystack', $html );
		$this->assertStringContainsString( 'value="Needle"', $html );
		$this->assertStringContainsString( 'searchText=Needle', $html );
		$this->assertStringContainsString( 'wpm-embedded-search-reset', $html );

		$_GET['searchText'] = 'Nothing matches this';
		$none               = $this->render();
		$this->assertStringNotContainsString( 'object-grid-box-wrapper', $none );
		$this->assertStringContainsString( 'No objects found.', $none );
	}

	public function test_renders_nothing_without_a_collection_in_the_loop() {
		$this->go_to( home_url( '/' ) );
		// Outside a post the block has no collection; it must not fatal.
		$html = $this->render();
		$this->assertIsString( $html );
	}
}
