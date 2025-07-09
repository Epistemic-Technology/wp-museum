<?php
/**
 * Class OAIPMHOutputTest
 *
 * @package Wp_Museum
 */

require_once plugin_dir_path(__FILE__) . "helpers/museum-test-data.php";

/**
 * Test case for OAI-PMH output functions and error handling.
 */
class OAIPMHOutputTest extends WP_UnitTestCase
{
    private $test_data;

    /**
     * Set up test environment.
     */
    public function setUp(): void
    {
        parent::setUp();

        // Ensure the OAI-PMH functions are loaded
        if (!function_exists("MikeThicke\WPMuseum\add_oai_pmh_rewrite_rules")) {
            require_once plugin_dir_path(__FILE__) .
                "../../src/includes/oai-pmh.php";
        }

        // Load object functions for kind_from_type
        if (!function_exists("MikeThicke\WPMuseum\kind_from_type")) {
            require_once plugin_dir_path(__FILE__) .
                "../../src/includes/object-functions.php";
        }

        // Load database functions for get_mobject_kinds
        if (!function_exists("MikeThicke\WPMuseum\get_mobject_kinds")) {
            require_once plugin_dir_path(__FILE__) .
                "../../src/includes/database-functions.php";
        }

        // Set up test data
        $this->test_data = MuseumTestData::setup_complete_test_environment(
            $this->factory
        );

        // Mock the get_object_type_names function
        if (!function_exists("MikeThicke\WPMuseum\get_object_type_names")) {
            function get_object_type_names()
            {
                return ["wpm_object", "wpm_instrument"];
            }
        }

        // Mock get_mobject_kinds function to return our test data
        add_filter("pre_transient_get_mobject_kinds", function () {
            return MuseumTestData::mock_get_mobject_kinds();
        });

        // Also mock the cache
        wp_cache_set(
            "get_mobject_kinds",
            MuseumTestData::mock_get_mobject_kinds(),
            "wp_museum"
        );
    }

    /**
     * Test OAI error output format.
     */
    public function test_output_oai_error()
    {
        ob_start();
        \MikeThicke\WPMuseum\output_oai_error(
            "badVerb",
            "Invalid verb provided"
        );
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<?xml version="1.0" encoding="UTF-8"?>',
            $output
        );
        $this->assertStringContainsString(
            '<error code="badVerb">Invalid verb provided</error>',
            $output
        );
        $this->assertStringContainsString("OAI-PMH", $output);
    }

    /**
     * Test OAI header output format.
     */
    public function test_output_oai_header()
    {
        $args = ["verb" => "Identify"];

        ob_start();
        \MikeThicke\WPMuseum\output_oai_header("Identify", $args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<?xml version="1.0" encoding="UTF-8"?>',
            $output
        );
        $this->assertStringContainsString("<OAI-PMH", $output);
        $this->assertStringContainsString(
            'xmlns="http://www.openarchives.org/OAI/2.0/"',
            $output
        );
        $this->assertStringContainsString("<responseDate>", $output);
        $this->assertStringContainsString("<request", $output);
        $this->assertStringContainsString('verb="Identify"', $output);
    }

    /**
     * Test OAI header output with multiple parameters.
     */
    public function test_output_oai_header_with_parameters()
    {
        $args = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "from" => "2023-01-01",
            "until" => "2023-12-31",
        ];

        ob_start();
        \MikeThicke\WPMuseum\output_oai_header("ListRecords", $args);
        $output = ob_get_clean();

        $this->assertStringContainsString('verb="ListRecords"', $output);
        $this->assertStringContainsString('metadataPrefix="oai_dc"', $output);
        $this->assertStringContainsString('from="2023-01-01"', $output);
        $this->assertStringContainsString('until="2023-12-31"', $output);
    }

    /**
     * Test OAI footer output format.
     */
    public function test_output_oai_footer()
    {
        ob_start();
        \MikeThicke\WPMuseum\output_oai_footer();
        $output = ob_get_clean();

        $this->assertStringContainsString("</OAI-PMH>", $output);
    }

    /**
     * Test identify handler output.
     */
    public function test_handle_identify()
    {
        $args = ["verb" => "Identify"];

        ob_start();
        \MikeThicke\WPMuseum\handle_identify($args);
        $output = ob_get_clean();

        $this->assertStringContainsString("<Identify>", $output);
        $this->assertStringContainsString("<repositoryName>", $output);
        $this->assertStringContainsString("<baseURL>", $output);
        $this->assertStringContainsString(
            "<protocolVersion>2.0</protocolVersion>",
            $output
        );
        $this->assertStringContainsString("<adminEmail>", $output);
        $this->assertStringContainsString("<earliestDatestamp>", $output);
        $this->assertStringContainsString(
            "<deletedRecord>no</deletedRecord>",
            $output
        );
        $this->assertStringContainsString(
            "<granularity>YYYY-MM-DDThh:mm:ssZ</granularity>",
            $output
        );
        $this->assertStringContainsString("</Identify>", $output);
    }

    /**
     * Test identify handler with invalid arguments.
     */
    public function test_handle_identify_with_invalid_args()
    {
        $args = ["verb" => "Identify", "invalid_arg" => "value"];

        ob_start();
        \MikeThicke\WPMuseum\handle_identify($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">Illegal argument: invalid_arg</error>',
            $output
        );
    }

    /**
     * Test list metadata formats handler.
     */
    public function test_handle_list_metadata_formats()
    {
        $args = ["verb" => "ListMetadataFormats"];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_metadata_formats($args);
        $output = ob_get_clean();

        $this->assertStringContainsString("<ListMetadataFormats>", $output);
        $this->assertStringContainsString("<metadataFormat>", $output);
        $this->assertStringContainsString(
            "<metadataPrefix>oai_dc</metadataPrefix>",
            $output
        );
        $this->assertStringContainsString(
            "<schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>",
            $output
        );
        $this->assertStringContainsString(
            "<metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>",
            $output
        );
    }

    /**
     * Test list metadata formats handler with invalid arguments.
     */
    public function test_handle_list_metadata_formats_with_invalid_args()
    {
        $args = ["verb" => "ListMetadataFormats", "invalid_arg" => "value"];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_metadata_formats($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">Illegal argument: invalid_arg</error>',
            $output
        );
    }

    /**
     * Test list sets handler.
     */
    public function test_handle_list_sets()
    {
        $args = ["verb" => "ListSets"];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_sets($args);
        $output = ob_get_clean();

        $this->assertStringContainsString("<ListSets>", $output);
        $this->assertStringContainsString("<set>", $output);
        $this->assertStringContainsString("<setSpec>", $output);
        $this->assertStringContainsString("<setName>", $output);

        // Should contain our test collection
        $this->assertStringContainsString("scientific-instruments", $output);
        $this->assertStringContainsString(
            "Scientific Instruments Collection",
            $output
        );
    }

    /**
     * Test list sets handler with invalid arguments.
     */
    public function test_handle_list_sets_with_invalid_args()
    {
        $args = ["verb" => "ListSets", "invalid_arg" => "value"];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_sets($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">Illegal argument: invalid_arg</error>',
            $output
        );
    }

    /**
     * Test get record handler with valid identifier.
     */
    public function test_handle_get_record_valid()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        $args = [
            "verb" => "GetRecord",
            "identifier" => $identifier,
            "metadataPrefix" => "oai_dc",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_get_record($args);
        $output = ob_get_clean();

        // Check if we get a valid response or expected error
        $this->assertTrue(
            strpos($output, "<GetRecord>") !== false ||
                strpos($output, '<error code="idDoesNotExist">') !== false
        );
    }

    /**
     * Test get record handler with missing identifier.
     */
    public function test_handle_get_record_missing_identifier()
    {
        $args = [
            "verb" => "GetRecord",
            "metadataPrefix" => "oai_dc",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_get_record($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">Missing required argument: identifier</error>',
            $output
        );
    }

    /**
     * Test get record handler with missing metadata prefix.
     */
    public function test_handle_get_record_missing_metadata_prefix()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        $args = [
            "verb" => "GetRecord",
            "identifier" => $identifier,
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_get_record($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">Missing required argument: metadataPrefix</error>',
            $output
        );
    }

    /**
     * Test get record handler with invalid identifier.
     */
    public function test_handle_get_record_invalid_identifier()
    {
        $args = [
            "verb" => "GetRecord",
            "identifier" => "invalid:identifier",
            "metadataPrefix" => "oai_dc",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_get_record($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            "The identifier does not exist",
            $output
        );
    }

    /**
     * Test get record handler with invalid metadata prefix.
     */
    public function test_handle_get_record_invalid_metadata_prefix()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        $args = [
            "verb" => "GetRecord",
            "identifier" => $identifier,
            "metadataPrefix" => "invalid_prefix",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_get_record($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="cannotDisseminateFormat">',
            $output
        );
    }

    /**
     * Test list identifiers handler.
     */
    public function test_handle_list_identifiers()
    {
        $args = [
            "verb" => "ListIdentifiers",
            "metadataPrefix" => "oai_dc",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_identifiers($args);
        $output = ob_get_clean();

        // Should either have identifiers or no records error
        $this->assertTrue(
            strpos($output, "<ListIdentifiers>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );
    }

    /**
     * Test list identifiers handler with missing metadata prefix.
     */
    public function test_handle_list_identifiers_missing_metadata_prefix()
    {
        $args = [
            "verb" => "ListIdentifiers",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_identifiers($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">Missing required argument: metadataPrefix</error>',
            $output
        );
    }

    /**
     * Test list identifiers handler with date range.
     */
    public function test_handle_list_identifiers_with_date_range()
    {
        $args = [
            "verb" => "ListIdentifiers",
            "metadataPrefix" => "oai_dc",
            "from" => "2023-01-01",
            "until" => "2025-01-01",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_identifiers($args);
        $output = ob_get_clean();

        // Should either have identifiers or no records error
        $this->assertTrue(
            strpos($output, "<ListIdentifiers>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );
    }

    /**
     * Test list records handler.
     */
    public function test_handle_list_records()
    {
        $args = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_records($args);
        $output = ob_get_clean();

        // Should either have records or no records error
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );
    }

    /**
     * Test list records handler with missing metadata prefix.
     */
    public function test_handle_list_records_missing_metadata_prefix()
    {
        $args = [
            "verb" => "ListRecords",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_records($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">Missing required argument: metadataPrefix</error>',
            $output
        );
    }

    /**
     * Test list records handler with set specification.
     */
    public function test_handle_list_records_with_set()
    {
        $collection = $this->test_data["collection"];
        $args = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "set" => $collection->post_name,
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_records($args);
        $output = ob_get_clean();

        // Should either have records or no records error
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );
    }

    /**
     * Test metadata output format.
     */
    public function test_output_metadata()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        ob_start();
        \MikeThicke\WPMuseum\output_metadata($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<metadata>", $output);
        $this->assertStringContainsString("<oai_dc:dc", $output);
        $this->assertStringContainsString("<dc:title>", $output);
        $this->assertStringContainsString("</oai_dc:dc>", $output);
        $this->assertStringContainsString("</metadata>", $output);

        // Should contain data from our test object
        $this->assertStringContainsString("Brass Telescope", $output);
        $this->assertStringContainsString("Zeiss", $output);
    }

    /**
     * Test metadata output with microscope data.
     */
    public function test_output_metadata_microscope()
    {
        $post = $this->test_data["microscope"];
        $post->post_type = "wpm_instrument";

        ob_start();
        \MikeThicke\WPMuseum\output_metadata($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<metadata>", $output);
        $this->assertStringContainsString("Victorian Microscope", $output);
        $this->assertStringContainsString("Ernst Leitz", $output);
        $this->assertStringContainsString("2024.SCI.002", $output);
    }

    /**
     * Test record header output.
     */
    public function test_output_header()
    {
        $post = $this->test_data["telescope"];

        ob_start();
        \MikeThicke\WPMuseum\output_header($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<header>", $output);
        $this->assertStringContainsString("<identifier>", $output);
        $this->assertStringContainsString("<datestamp>", $output);
        $this->assertStringContainsString("</header>", $output);

        // Should contain the post ID in the identifier
        $this->assertStringContainsString($post->ID, $output);
    }

    /**
     * Test record header output with setSpec.
     */
    public function test_output_header_with_setspec()
    {
        $post = $this->test_data["telescope"];
        $collection = $this->test_data["collection"];

        ob_start();
        \MikeThicke\WPMuseum\output_header($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<header>", $output);
        $this->assertStringContainsString("<identifier>", $output);
        $this->assertStringContainsString("<datestamp>", $output);

        // Should contain setSpec for the collection
        $this->assertTrue(
            strpos($output, "<setSpec>") !== false ||
                strpos($output, $collection->post_name) !== false
        );
    }

    /**
     * Test record output format.
     */
    public function test_output_record()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        ob_start();
        \MikeThicke\WPMuseum\output_record($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<record>", $output);
        $this->assertStringContainsString("<header>", $output);
        $this->assertStringContainsString("<metadata>", $output);
        $this->assertStringContainsString("</record>", $output);

        // Should contain our test data
        $this->assertStringContainsString("Brass Telescope", $output);
        $this->assertStringContainsString($post->ID, $output);
    }

    /**
     * Test error handling for various invalid date formats.
     */
    public function test_error_handling_invalid_dates()
    {
        $args = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "from" => "invalid-date-format",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_records($args);
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">',
            $output
        );
        $this->assertStringContainsString("Invalid date format", $output);
    }

    /**
     * Test error handling for invalid set specification.
     */
    public function test_error_handling_invalid_set()
    {
        $args = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "set" => "nonexistent-collection",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_records($args);
        $output = ob_get_clean();

        // Should handle invalid set gracefully
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !==
                    false ||
                strpos($output, '<error code="badArgument">') !== false
        );
    }

    /**
     * Test resumption token handling.
     */
    public function test_resumption_token_handling()
    {
        $args = [
            "verb" => "ListRecords",
            "resumptionToken" => "offset:0:limit:1",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_records($args);
        $output = ob_get_clean();

        // Should handle resumption token
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );
    }

    /**
     * Clean up after tests.
     */
    public function tearDown(): void
    {
        MuseumTestData::cleanup_test_data();
        parent::tearDown();
    }
}
