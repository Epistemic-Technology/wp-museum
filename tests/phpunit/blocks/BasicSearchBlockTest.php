<?php
/**
 * Tests for the server-rendered basic-search block.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Blocks;

require_once dirname( __DIR__ ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;
use MuseumTestData;

/**
 * The block is a GET search form plus a paginated grid of the matching
 * objects, all driven by the query string.
 */
class BasicSearchBlockTest extends WP_Museum_Test_Case {

	/**
	 * @var array
	 */
	private $test_data;

	/**
	 * @var int
	 */
	private $search_page_id;

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
		$this->search_page_id = $this->factory->post->create(
			[
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Search',
				'post_content' => '<!-- wp:wp-museum/basic-search /-->',
			]
		);
		wp_cache_flush();
		$this->go_to( get_permalink( $this->search_page_id ) );
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
		return do_blocks( '<!-- wp:wp-museum/basic-search' . $json . ' /-->' );
	}

	/**
	 * Create $count published instruments whose titles start with $prefix.
	 *
	 * @return int[] Post IDs.
	 */
	private function add_objects( int $count, string $prefix, string $content = '' ): array {
		$ids = [];
		for ( $i = 1; $i <= $count; $i++ ) {
			$ids[] = $this->factory->post->create(
				[
					'post_type'    => 'wpm_instrument',
					'post_status'  => 'publish',
					'post_title'   => sprintf( '%s %02d', $prefix, $i ),
					'post_content' => $content,
				]
			);
		}
		return $ids;
	}

	public function test_renders_a_get_form_and_no_results_without_a_search() {
		$html = $this->render();

		$this->assertStringContainsString( 'wpm-basic-search-block', $html );
		$this->assertStringContainsString( 'wp-block-wp-museum-basic-search', $html );
		$this->assertStringContainsString( 'method="get"', $html );
		$this->assertStringContainsString( 'action="' . get_permalink( $this->search_page_id ) . '"', $html );
		$this->assertStringContainsString( 'name="searchText"', $html );
		$this->assertStringContainsString( 'wpm-embedded-search-title-toggle', $html );
		// The toggle defaults to on.
		$this->assertStringContainsString( 'value="1" checked', $html );
		$this->assertStringNotContainsString( 'object-grid-box-wrapper', $html );
		$this->assertStringNotContainsString( 'No objects found.', $html );
		// The React mount point and its JSON payload are gone.
		$this->assertStringNotContainsString( 'wpm-basic-search-block-frontend', $html );
		$this->assertStringNotContainsString( 'data-attributes=', $html );

		$block = \WP_Block_Type_Registry::get_instance()->get_registered( 'wp-museum/basic-search' );
		$this->assertEmpty( $block->view_script_handles );
	}

	public function test_renders_matching_objects_from_the_query_string() {
		$telescope          = $this->test_data['telescope'];
		$_GET['searchText'] = 'Telescope';
		$_GET['onlyTitle']  = '1';

		$html = $this->render();

		$this->assertStringContainsString( '<div class="wpm-object-grid">', $html );
		$this->assertStringContainsString( 'href="' . get_permalink( $telescope ) . '"', $html );
		$this->assertStringContainsString( 'value="Telescope"', $html );
		$this->assertStringNotContainsString( 'Microscope', $html );
	}

	public function test_only_title_toggle_controls_whether_content_is_searched() {
		$this->add_objects( 1, 'Astrolabe', 'Made of brass with silver inlay.' );

		$_GET['searchText'] = 'inlay';
		$_GET['onlyTitle']  = '1';
		$title_only         = $this->render();
		$this->assertStringNotContainsString( 'object-grid-box-wrapper', $title_only );
		$this->assertStringContainsString( 'No objects found.', $title_only );
		$this->assertStringContainsString( 'value="1" checked', $title_only );

		$_GET['onlyTitle'] = '0';
		$everything        = $this->render();
		$this->assertStringContainsString( 'Astrolabe 01', $everything );
		$this->assertStringNotContainsString( 'value="1" checked', $everything );

		// Older links sent the string "false", which must not read as true.
		$_GET['onlyTitle'] = 'false';
		$this->assertStringContainsString( 'Astrolabe 01', $this->render() );
	}

	public function test_paginates_and_carries_the_search_in_page_links() {
		$this->add_objects( 25, 'Needle' );
		$this->add_objects( 3, 'Haystack' );

		$_GET['searchText'] = 'Needle';
		$_GET['onlyTitle']  = '1';
		$first              = $this->render();

		$this->assertSame( 20, substr_count( $first, 'class="object-grid-box-wrapper"' ) );
		$this->assertStringNotContainsString( 'Haystack', $first );
		$this->assertStringContainsString( 'aria-label="Go to page 2"', $first );
		$this->assertStringNotContainsString( 'aria-label="Go to page 3"', $first );
		$this->assertMatchesRegularExpression( '/href="[^"]*searchText=Needle[^"]*wpm_page=2"/', $first );
		$this->assertSame( 2, substr_count( $first, '<div class="pagination">' ) );

		$_GET['wpm_page'] = '2';
		$second           = $this->render();
		$this->assertSame( 5, substr_count( $second, 'class="object-grid-box-wrapper"' ) );
		$this->assertMatchesRegularExpression( '/<li class="page-list-selected">\s*<a href="[^"]*wpm_page=2"/', $second );

		$unlimited = $this->render( [ 'resultsPerPage' => -1 ] );
		$this->assertSame( 25, substr_count( $unlimited, 'class="object-grid-box-wrapper"' ) );
		$this->assertStringNotContainsString( '<div class="pagination">', $unlimited );
	}

	public function test_columns_attribute_sets_the_grid_width() {
		$this->add_objects( 2, 'Needle' );
		$_GET['searchText'] = 'Needle';

		$this->assertStringContainsString( 'calc(25% - 10px)', $this->render() );
		$this->assertStringContainsString( 'calc(50% - 10px)', $this->render( [ 'columns' => 2 ] ) );
	}

	public function test_advanced_search_link_carries_the_current_term() {
		$plain = $this->render( [ 'advancedSearchLink' => 'https://example.org/advanced/' ] );
		$this->assertStringContainsString( 'href="https://example.org/advanced/"', $plain );
		$this->assertStringContainsString( 'Advanced Search', $plain );

		$_GET['searchText'] = 'Telescope';
		$with_term          = $this->render( [ 'advancedSearchLink' => 'https://example.org/advanced/' ] );
		$this->assertStringContainsString( 'href="https://example.org/advanced/?searchText=Telescope"', $with_term );

		$this->assertStringNotContainsString( 'Advanced Search', $this->render() );
	}

	public function test_search_text_attribute_is_the_fallback_when_there_is_no_query() {
		$html = $this->render( [ 'searchText' => 'Telescope' ] );
		$this->assertStringContainsString( 'href="' . get_permalink( $this->test_data['telescope'] ) . '"', $html );

		$_GET['searchText'] = 'Microscope';
		$override           = $this->render( [ 'searchText' => 'Telescope' ] );
		$this->assertStringNotContainsString( 'Telescope', $override );
	}
}
