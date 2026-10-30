<?php
/**
 * Tests for the server-rendered Featured Collection block.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\Blocks;

require_once dirname( __DIR__ ) . '/helpers/museum-test-data.php';

use MikeThicke\WPMuseum;
use MikeThicke\WPMuseum\WP_Museum_Test_Case;
use MuseumTestData;

/**
 * The block lists the current object's collections, and only on object pages.
 */
class FeatureCollectionWidgetBlockTest extends WP_Museum_Test_Case {

	/**
	 * Test environment data.
	 *
	 * @var array
	 */
	private $test_data;

	public function setUp(): void {
		parent::setUp();
		WPMuseum\db_version_check();
		$this->test_data = MuseumTestData::setup_complete_test_environment( $this->factory );
		WPMuseum\create_mobject_post_types();
		WPMuseum\register_collection_taxonomy();
		// ObjectPostType::register() defers to `init`, which has already run
		// here; register the type directly so object permalinks resolve to a
		// singular query the way they do on the site.
		foreach ( WPMuseum\get_object_type_names() as $type_name ) {
			if ( ! post_type_exists( $type_name ) ) {
				register_post_type( $type_name, [ 'public' => true ] );
			}
		}
		wp_cache_flush();
	}

	public function tearDown(): void {
		// Leave the registry as other tests expect it: some assert on the
		// notice WordPress raises when an object type is not registered.
		foreach ( WPMuseum\get_object_type_names() as $type_name ) {
			if ( post_type_exists( $type_name ) ) {
				unregister_post_type( $type_name );
			}
		}
		parent::tearDown();
	}

	private function render( array $attributes = [] ): string {
		$json = empty( $attributes ) ? '' : ' ' . wp_json_encode( $attributes );
		return do_blocks( '<!-- wp:wp-museum/feature-collection-widget' . $json . ' /-->' );
	}

	public function test_renders_nothing_outside_an_object_page() {
		$this->go_to( home_url( '/' ) );
		$this->assertSame( '', trim( $this->render() ) );

		$page = $this->factory->post->create( [ 'post_type' => 'page', 'post_status' => 'publish' ] );
		$this->go_to( get_permalink( $page ) );
		$this->assertSame( '', trim( $this->render() ) );
	}

	public function test_lists_the_objects_collections_on_its_page() {
		$object     = $this->test_data['telescope'];
		$collection = $this->test_data['collection'];
		$this->assertNotEmpty( WPMuseum\get_object_collections( $object->ID ), 'fixture: object should be in a collection' );

		$this->go_to( get_permalink( $object ) );
		$html = $this->render();

		$this->assertStringContainsString( 'wpm-feature-collection-widget', $html );
		$this->assertStringContainsString( 'class="wpm-featured-collection"', $html );
		$this->assertStringContainsString( 'href="' . get_permalink( $collection ) . '"', $html );
		$this->assertStringContainsString( esc_html( get_the_title( $collection ) ), $html );
		$this->assertStringNotContainsString( 'The attributes are:', $html );
	}

	public function test_description_and_image_can_be_hidden() {
		$object     = $this->test_data['telescope'];
		$collection = $this->test_data['collection'];
		wp_update_post(
			[
				'ID'           => $collection->ID,
				'post_excerpt' => 'A fine set of instruments.',
			]
		);
		$this->go_to( get_permalink( $object ) );

		$html = $this->render();
		$this->assertStringContainsString( 'A fine set of instruments.', $html );

		$html = $this->render( [ 'showDescription' => false ] );
		$this->assertStringNotContainsString( 'A fine set of instruments.', $html );
		$this->assertStringNotContainsString( 'wpm-featured-collection-description', $html );

		$html = $this->render( [ 'showFeatureImage' => false ] );
		$this->assertStringNotContainsString( 'wpm-featured-collection-image', $html );
	}
}
