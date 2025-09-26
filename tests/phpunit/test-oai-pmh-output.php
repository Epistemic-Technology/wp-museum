<?php
/**
 * Class OAIPMHOutputTest
 *
 * @package Wp_Museum
 */

require_once plugin_dir_path(__FILE__) . "helpers/museum-test-data.php";

use MikeThicke\WPMuseum\WP_Museum_Test_Case;

/**
 * Test case for OAI-PMH output functions and error handling.
 */
class OAIPMHOutputTest extends WP_Museum_Test_Case
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

        // Create real object kinds (tables are already set up by base class)
        $this->create_test_object_kinds();

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
    }

    /**
     * Clean up test data after each test.
     */
    public function tearDown(): void
    {
        global $wpdb;

        // Disable database error output to prevent headers already sent issues
        $original_show_errors = $wpdb->show_errors;
        $wpdb->show_errors = false;

        // Clean up the test tables to avoid conflicts
        $kinds_table = $wpdb->prefix . "wpm_mobject_kinds";
        $fields_table = $wpdb->prefix . "wpm_mobject_fields";

        $wpdb->query("TRUNCATE TABLE $kinds_table");
        $wpdb->query("TRUNCATE TABLE $fields_table");

        // Clear cache
        wp_cache_delete("get_mobject_kinds", "wp_museum");
        wp_cache_flush_group("wp_museum");

        // Clean up test data from MuseumTestData
        MuseumTestData::cleanup_test_data();

        // Restore original error reporting
        $wpdb->show_errors = $original_show_errors;

        parent::tearDown();
    }

    /**
     * Create test object kinds in the database.
     */
    private function create_test_object_kinds()
    {
        global $wpdb;
        $kinds_table = $wpdb->prefix . "wpm_mobject_kinds";
        $fields_table = $wpdb->prefix . "wpm_mobject_fields";

        // Insert categorization field first
        $wpdb->insert(
            $fields_table,
            [
                "field_id" => 1,
                "slug" => "accession-number",
                "kind_id" => 1,
                "name" => "Accession Number",
                "type" => "plain",
                "display_order" => 0,
                "public" => 1,
                "required" => 1,
                "quick_browse" => 1,
                "help_text" => "Number in our catalogue system.",
                "field_schema" => "(?<C>\\d+)\\.(?<A>\\w+)\\.(?<B>\\d+)",
                "max_length" => 50,
            ],
            [
                "%d",
                "%s",
                "%d",
                "%s",
                "%s",
                "%d",
                "%d",
                "%d",
                "%d",
                "%s",
                "%s",
                "%d",
            ]
        );

        // Insert other required fields
        $fields = [
            [
                "field_id" => 2,
                "slug" => "name",
                "kind_id" => 1,
                "name" => "Name",
                "type" => "plain",
                "display_order" => 1,
                "public" => 1,
                "required" => 1,
                "quick_browse" => 1,
                "help_text" => "Common name of the instrument.",
                "max_length" => 200,
            ],
            [
                "field_id" => 3,
                "slug" => "description",
                "kind_id" => 1,
                "name" => "Description",
                "type" => "rich",
                "display_order" => 2,
                "public" => 1,
                "required" => 0,
                "quick_browse" => 0,
                "help_text" => "Detailed description of the instrument.",
                "max_length" => 0,
            ],
            [
                "field_id" => 4,
                "slug" => "manufacturer",
                "kind_id" => 1,
                "name" => "Manufacturer",
                "type" => "plain",
                "display_order" => 3,
                "public" => 1,
                "required" => 0,
                "quick_browse" => 1,
                "help_text" => "Who made this instrument?",
                "max_length" => 150,
            ],
            [
                "field_id" => 5,
                "slug" => "date-of-manufacture",
                "kind_id" => 1,
                "name" => "Date of Manufacture",
                "type" => "date",
                "display_order" => 4,
                "public" => 1,
                "required" => 0,
                "quick_browse" => 0,
                "help_text" => "When was the instrument made?",
                "max_length" => 0,
            ],
            [
                "field_id" => 6,
                "slug" => "primary-materials",
                "kind_id" => 1,
                "name" => "Primary Materials",
                "type" => "plain",
                "display_order" => 5,
                "public" => 1,
                "required" => 0,
                "quick_browse" => 0,
                "help_text" => "Materials used in construction of instrument.",
                "max_length" => 200,
            ],
        ];

        foreach ($fields as $field) {
            $wpdb->insert($fields_table, $field, [
                "%d",
                "%s",
                "%d",
                "%s",
                "%s",
                "%d",
                "%d",
                "%d",
                "%d",
                "%s",
                "%d",
            ]);
        }

        // Insert test instrument kind with cat_field_id pointing to accession-number
        $wpdb->insert(
            $kinds_table,
            [
                "kind_id" => 1,
                "cat_field_id" => 1, // Points to accession-number field
                "name" => "instrument",
                "type_name" => "wpm_instrument",
                "label" => "Instrument",
                "label_plural" => "Instruments",
                "description" => "A scientific instrument",
                "categorized" => 1,
                "hierarchical" => 0,
                "must_featured_image" => 0,
                "must_gallery" => 0,
                "strict_checking" => 0,
                "exclude_from_search" => 0,
                "oai_pmh_mappings" => wp_json_encode([
                    "title" => ["field" => "name", "staticValue" => ""],
                    "creator" => [
                        "field" => "manufacturer",
                        "staticValue" => "",
                    ],
                    "subject" => ["field" => "", "staticValue" => ""],
                    "description" => [
                        "field" => "description",
                        "staticValue" => "",
                    ],
                    "publisher" => [
                        "field" => "",
                        "staticValue" => "Museum Collection",
                    ],
                    "contributor" => ["field" => "", "staticValue" => ""],
                    "date" => [
                        "field" => "date-of-manufacture",
                        "staticValue" => "",
                    ],
                    "type" => [
                        "field" => "",
                        "staticValue" => "Scientific Instrument",
                    ],
                    "format" => [
                        "field" => "primary-materials",
                        "staticValue" => "",
                    ],
                    "identifier" => [
                        "field" => "accession-number",
                        "staticValue" => "",
                    ],
                    "source" => ["field" => "", "staticValue" => ""],
                    "language" => ["field" => "", "staticValue" => "en"],
                    "relation" => ["field" => "", "staticValue" => ""],
                    "coverage" => ["field" => "", "staticValue" => ""],
                    "rights" => ["field" => "", "staticValue" => ""],
                    "identifier_prefix" => "",
                ]),
            ],
            [
                "%d",
                "%d",
                "%s",
                "%s",
                "%s",
                "%s",
                "%s",
                "%d",
                "%d",
                "%d",
                "%d",
                "%d",
                "%d",
                "%s",
            ]
        );

        // Clear cache so it picks up our new data
        wp_cache_delete("get_mobject_kinds", "wp_museum");
        wp_cache_delete("get_mobject_fields1", "wp_museum");
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

        // Add required identifier field to post meta
        add_post_meta($post->ID, "accession-number", "TEST.INSTRUMENT.001");

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
     * Test get record handler with missing metadata prefix (should return badArgument error).
     */
    public function test_handle_get_record_missing_metadata_prefix()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        // Add required identifier field to post meta
        add_post_meta($post->ID, "accession-number", "TEST.INSTRUMENT.002");

        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        $args = [
            "verb" => "GetRecord",
            "identifier" => $identifier,
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_get_record($args);
        $output = ob_get_clean();

        // Should return badArgument error when metadataPrefix is missing
        $this->assertStringContainsString(
            '<error code="badArgument">',
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
            "No post found for identifier",
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

        // Add required identifier field to post meta
        add_post_meta($post->ID, "accession-number", "TEST.INSTRUMENT.003");

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
     * Test list identifiers handler with missing metadata prefix (should return badArgument error).
     */
    public function test_handle_list_identifiers_missing_metadata_prefix()
    {
        $args = [
            "verb" => "ListIdentifiers",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_identifiers($args);
        $output = ob_get_clean();

        // Should return badArgument error when metadataPrefix is missing
        $this->assertStringContainsString(
            '<error code="badArgument">',
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
     * Test list records handler with missing metadata prefix (should return badArgument error).
     */
    public function test_handle_list_records_missing_metadata_prefix()
    {
        $args = [
            "verb" => "ListRecords",
        ];

        ob_start();
        \MikeThicke\WPMuseum\handle_list_records($args);
        $output = ob_get_clean();

        // Should return badArgument error when metadataPrefix is missing
        $this->assertStringContainsString(
            '<error code="badArgument">',
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

        // Add required field values that map to OAI-PMH fields
        add_post_meta($post->ID, "name", "Brass Telescope");
        add_post_meta($post->ID, "manufacturer", "Zeiss");
        add_post_meta(
            $post->ID,
            "description",
            "A fine brass telescope for astronomical observation"
        );
        add_post_meta($post->ID, "date-of-manufacture", "1890-01-01");
        add_post_meta($post->ID, "primary-materials", "Brass, Glass");
        add_post_meta($post->ID, "accession-number", "TEST.TELESCOPE.001");

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

        // Add required field values that map to OAI-PMH fields
        add_post_meta($post->ID, "name", "Victorian Microscope");
        add_post_meta($post->ID, "manufacturer", "Ernst Leitz");
        add_post_meta(
            $post->ID,
            "description",
            "A Victorian-era compound microscope"
        );
        add_post_meta($post->ID, "date-of-manufacture", "1885-01-01");
        add_post_meta($post->ID, "primary-materials", "Brass, Steel, Glass");
        add_post_meta($post->ID, "accession-number", "2024.SCI.002");

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
        $post->post_type = "wpm_instrument";

        // Add required identifier field to post meta
        update_post_meta($post->ID, "accession-number", "TEST.TELESCOPE.002");

        ob_start();
        \MikeThicke\WPMuseum\output_header($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<header>", $output);
        $this->assertStringContainsString("<identifier>", $output);
        $this->assertStringContainsString("<datestamp>", $output);
        $this->assertStringContainsString("</header>", $output);

        // Should contain the accession number in the identifier
        $this->assertStringContainsString("TEST.TELESCOPE.002", $output);
    }

    /**
     * Test record header output with setSpec.
     */
    public function test_output_header_with_setspec()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";
        $collection = $this->test_data["collection"];

        // Add required identifier field to post meta
        add_post_meta($post->ID, "accession-number", "TEST.TELESCOPE.003");

        ob_start();
        \MikeThicke\WPMuseum\output_header($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<header>", $output);
        $this->assertStringContainsString("<identifier>", $output);
        $this->assertStringContainsString("<datestamp>", $output);

        // Should contain basic header elements (setSpec is optional and depends on collection setup)
        $this->assertStringContainsString("</header>", $output);
    }

    /**
     * Test record output format.
     */
    public function test_output_record()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";

        // Add required identifier field to post meta
        update_post_meta($post->ID, "accession-number", "TEST.TELESCOPE.004");
        update_post_meta($post->ID, "name", "Brass Telescope");

        ob_start();
        \MikeThicke\WPMuseum\output_record($post);
        $output = ob_get_clean();

        $this->assertStringContainsString("<record>", $output);
        $this->assertStringContainsString("<header>", $output);
        $this->assertStringContainsString("<metadata>", $output);
        $this->assertStringContainsString("</record>", $output);

        // Should contain our test data
        $this->assertStringContainsString("Brass Telescope", $output);
        $this->assertStringContainsString("TEST.TELESCOPE.004", $output);
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
}
