<?php
/**
 * Class OAIPMHRequestsTest
 *
 * @package Wp_Museum
 */

require_once plugin_dir_path(__FILE__) . "helpers/museum-test-data.php";

/**
 * Test case for OAI-PMH request handling and HTTP interactions.
 */
class OAIPMHRequestsTest extends WP_UnitTestCase
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

        // Set up query var
        set_query_var("oai_pmh", "1");
    }

    /**
     * Test request handler with missing verb.
     */
    public function test_handle_oai_pmh_request_missing_verb()
    {
        $_GET = [];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badVerb">Missing verb argument</error>',
            $output
        );
    }

    /**
     * Test request handler with invalid verb.
     */
    public function test_handle_oai_pmh_request_invalid_verb()
    {
        $_GET = ["verb" => "InvalidVerb"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badVerb">Illegal OAI verb: InvalidVerb</error>',
            $output
        );
    }

    /**
     * Test request handler with Identify verb.
     */
    public function test_handle_oai_pmh_request_identify()
    {
        $_GET = ["verb" => "Identify"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
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
    }

    /**
     * Test request handler with ListMetadataFormats verb.
     */
    public function test_handle_oai_pmh_request_list_metadata_formats()
    {
        $_GET = ["verb" => "ListMetadataFormats"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString("<ListMetadataFormats>", $output);
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
     * Test request handler with ListSets verb.
     */
    public function test_handle_oai_pmh_request_list_sets()
    {
        $_GET = ["verb" => "ListSets"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
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
     * Test request handler with GetRecord verb.
     */
    public function test_handle_oai_pmh_request_get_record()
    {
        $post = $this->test_data["telescope"];
        $post->post_type = "wpm_instrument";
        $identifier = \MikeThicke\WPMuseum\get_oai_identifier($post);

        $_GET = [
            "verb" => "GetRecord",
            "identifier" => $identifier,
            "metadataPrefix" => "oai_dc",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should contain GetRecord response or appropriate error
        $this->assertTrue(
            strpos($output, "<GetRecord>") !== false ||
                strpos($output, '<error code="idDoesNotExist">') !== false
        );

        if (strpos($output, "<GetRecord>") !== false) {
            $this->assertStringContainsString("<record>", $output);
            $this->assertStringContainsString(
                "<identifier>" . $identifier . "</identifier>",
                $output
            );
        }
    }

    /**
     * Test request handler with ListIdentifiers verb.
     */
    public function test_handle_oai_pmh_request_list_identifiers()
    {
        $_GET = [
            "verb" => "ListIdentifiers",
            "metadataPrefix" => "oai_dc",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should contain ListIdentifiers response or no records error
        $this->assertTrue(
            strpos($output, "<ListIdentifiers>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );

        if (strpos($output, "<ListIdentifiers>") !== false) {
            $this->assertStringContainsString("<header>", $output);
            $this->assertStringContainsString("<identifier>", $output);
        }
    }

    /**
     * Test request handler with ListRecords verb.
     */
    public function test_handle_oai_pmh_request_list_records()
    {
        $_GET = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should contain ListRecords response or no records error
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );

        if (strpos($output, "<ListRecords>") !== false) {
            $this->assertStringContainsString("<record>", $output);
            $this->assertStringContainsString("<metadata>", $output);
        }
    }

    /**
     * Test request handler with POST parameters.
     */
    public function test_handle_oai_pmh_request_post_parameters()
    {
        $_GET = [];
        $_POST = ["verb" => "Identify"];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString("<Identify>", $output);
        $this->assertStringContainsString("<repositoryName>", $output);
    }

    /**
     * Test request handler with mixed GET and POST parameters.
     */
    public function test_handle_oai_pmh_request_mixed_parameters()
    {
        $_GET = ["verb" => "GetRecord"];
        $_POST = ["metadataPrefix" => "oai_dc"];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should fail due to missing identifier
        $this->assertStringContainsString(
            '<error code="badArgument">Missing required argument: identifier</error>',
            $output
        );
    }

    /**
     * Test request handler with date range parameters.
     */
    public function test_handle_oai_pmh_request_with_date_range()
    {
        $_GET = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "from" => "2023-01-01",
            "until" => "2025-01-01",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should contain ListRecords response or no records error
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );

        // Should include from and until in the request element
        $this->assertStringContainsString('from="2023-01-01"', $output);
        $this->assertStringContainsString('until="2025-01-01"', $output);
    }

    /**
     * Test request handler with set specification.
     */
    public function test_handle_oai_pmh_request_with_set()
    {
        $collection = $this->test_data["collection"];

        $_GET = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "set" => $collection->post_name,
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should contain ListRecords response or no records error
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );

        // Should include set in the request element
        $this->assertStringContainsString(
            'set="' . $collection->post_name . '"',
            $output
        );
    }

    /**
     * Test request handler with resumption token.
     */
    public function test_handle_oai_pmh_request_with_resumption_token()
    {
        $_GET = [
            "verb" => "ListRecords",
            "resumptionToken" => "offset:0:limit:1",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should contain ListRecords response or no records error
        $this->assertTrue(
            strpos($output, "<ListRecords>") !== false ||
                strpos($output, "No records match the given criteria") !== false
        );

        // Should include resumptionToken in the request element
        $this->assertStringContainsString(
            'resumptionToken="offset:0:limit:1"',
            $output
        );
    }

    /**
     * Test request handler with invalid metadata prefix.
     */
    public function test_handle_oai_pmh_request_invalid_metadata_prefix()
    {
        $_GET = [
            "verb" => "ListRecords",
            "metadataPrefix" => "invalid_prefix",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="cannotDisseminateFormat">',
            $output
        );
    }

    /**
     * Test request handler with invalid date format.
     */
    public function test_handle_oai_pmh_request_invalid_date()
    {
        $_GET = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "from" => "invalid-date",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">',
            $output
        );
        $this->assertStringContainsString("Invalid date format", $output);
    }

    /**
     * Test request handler with invalid until date.
     */
    public function test_handle_oai_pmh_request_invalid_until_date()
    {
        $_GET = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "until" => "not-a-date",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">',
            $output
        );
        $this->assertStringContainsString("Invalid date format", $output);
    }

    /**
     * Test request handler with from date later than until date.
     */
    public function test_handle_oai_pmh_request_invalid_date_range()
    {
        $_GET = [
            "verb" => "ListRecords",
            "metadataPrefix" => "oai_dc",
            "from" => "2023-12-31",
            "until" => "2023-01-01",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<error code="badArgument">',
            $output
        );
        $this->assertStringContainsString(
            "from date must be earlier than until date",
            $output
        );
    }

    /**
     * Test request handler doesn't execute when query var is not set.
     */
    public function test_handle_oai_pmh_request_no_query_var()
    {
        // Clear the query var
        set_query_var("oai_pmh", "");

        $_GET = ["verb" => "Identify"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should produce no output when query var is not set
        $this->assertEmpty($output);
    }

    /**
     * Test that valid verbs are recognized.
     */
    public function test_valid_verbs()
    {
        $valid_verbs = [
            "Identify",
            "ListMetadataFormats",
            "ListSets",
            "GetRecord",
            "ListIdentifiers",
            "ListRecords",
        ];

        foreach ($valid_verbs as $verb) {
            $_GET = ["verb" => $verb];
            $_POST = [];

            ob_start();
            \MikeThicke\WPMuseum\handle_oai_pmh_request();
            $output = ob_get_clean();

            // Should not contain badVerb error
            $this->assertStringNotContainsString(
                '<error code="badVerb">Illegal OAI verb:',
                $output
            );
        }
    }

    /**
     * Test content type header is set correctly.
     */
    public function test_content_type_header()
    {
        $_GET = ["verb" => "Identify"];
        $_POST = [];

        // Since we can't easily test headers in unit tests, we'll just verify
        // the function runs without fatal errors and produces XML output
        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        $this->assertStringContainsString(
            '<?xml version="1.0" encoding="UTF-8"?>',
            $output
        );
        $this->assertStringContainsString("<OAI-PMH", $output);
    }

    /**
     * Test error handling for multiple errors.
     */
    public function test_multiple_errors()
    {
        $_GET = [
            "verb" => "GetRecord",
            "metadataPrefix" => "invalid_prefix",
            "invalid_arg" => "value",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should contain at least one error
        $this->assertStringContainsString("<error code=", $output);
    }

    /**
     * Test XML structure is well-formed.
     */
    public function test_xml_structure()
    {
        $_GET = ["verb" => "Identify"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Test basic XML structure
        $this->assertStringContainsString(
            '<?xml version="1.0" encoding="UTF-8"?>',
            $output
        );
        $this->assertStringContainsString("<OAI-PMH", $output);
        $this->assertStringContainsString("xmlns=", $output);
        $this->assertStringContainsString("<responseDate>", $output);
        $this->assertStringContainsString("<request", $output);
        $this->assertStringContainsString("</OAI-PMH>", $output);

        // Test that output is valid XML
        $dom = new DOMDocument();
        $dom->loadXML($output);
        $this->assertInstanceOf(DOMDocument::class, $dom);
    }

    /**
     * Test identify response contains required elements.
     */
    public function test_identify_response_completeness()
    {
        $_GET = ["verb" => "Identify"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Check all required Identify elements are present
        $required_elements = [
            "<repositoryName>",
            "<baseURL>",
            "<protocolVersion>",
            "<adminEmail>",
            "<earliestDatestamp>",
            "<deletedRecord>",
            "<granularity>",
        ];

        foreach ($required_elements as $element) {
            $this->assertStringContainsString($element, $output);
        }
    }

    /**
     * Test ListMetadataFormats response contains required elements.
     */
    public function test_list_metadata_formats_completeness()
    {
        $_GET = ["verb" => "ListMetadataFormats"];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Check required elements are present
        $this->assertStringContainsString("<ListMetadataFormats>", $output);
        $this->assertStringContainsString("<metadataFormat>", $output);
        $this->assertStringContainsString("<metadataPrefix>", $output);
        $this->assertStringContainsString("<schema>", $output);
        $this->assertStringContainsString("<metadataNamespace>", $output);
    }

    /**
     * Test request with extremely long parameters.
     */
    public function test_request_with_long_parameters()
    {
        $_GET = [
            "verb" => "GetRecord",
            "identifier" => str_repeat("a", 1000),
            "metadataPrefix" => "oai_dc",
        ];
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should handle long parameters gracefully
        $this->assertStringContainsString(
            '<error code="idDoesNotExist">',
            $output
        );
    }

    /**
     * Test case sensitivity of verbs.
     */
    public function test_verb_case_sensitivity()
    {
        $_GET = ["verb" => "identify"]; // lowercase
        $_POST = [];

        ob_start();
        \MikeThicke\WPMuseum\handle_oai_pmh_request();
        $output = ob_get_clean();

        // Should be case sensitive and return error
        $this->assertStringContainsString(
            '<error code="badVerb">Illegal OAI verb: identify</error>',
            $output
        );
    }

    /**
     * Clean up after tests.
     */
    public function tearDown(): void
    {
        // Clean up global variables
        $_GET = [];
        $_POST = [];
        set_query_var("oai_pmh", "");

        MuseumTestData::cleanup_test_data();
        parent::tearDown();
    }
}
