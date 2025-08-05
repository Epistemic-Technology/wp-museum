<?php
/**
 * OAI-PMH (Open Archives Initiative Protocol for Metadata Harvesting) implementation.
 *
 * This file contains the implementation of the OAI-PMH protocol for the WP-Museum plugin.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

function add_oai_pmh_rewrite_rules()
{
    add_rewrite_rule("^oai-pmh/?", "index.php?oai_pmh=1", "top");
}

function add_oai_pmh_query_vars($vars)
{
    $vars[] = "oai_pmh";
    return $vars;
}

function handle_oai_pmh_request()
{
    if (!get_query_var("oai_pmh")) {
        return;
    }

    // Set XML content type (skip during tests to avoid headers already sent error)
    // if (!defined("WP_TESTS_DOMAIN")) {
    //     header("Content-Type: text/xml; charset=utf-8");
    // }

    // Get and validate verb
    $verb = $_GET["verb"] ?? ($_POST["verb"] ?? "");

    if (empty($verb)) {
        output_oai_error("badVerb", "Missing verb argument");
        if (!defined("WP_TESTS_DOMAIN")) {
            exit();
        }
        return;
    }

    // Validate verb
    $valid_verbs = [
        "Identify",
        "ListMetadataFormats",
        "ListSets",
        "GetRecord",
        "ListIdentifiers",
        "ListRecords",
    ];
    if (!in_array($verb, $valid_verbs)) {
        output_oai_error("badVerb", "Illegal OAI verb: $verb");
        if (!defined("WP_TESTS_DOMAIN")) {
            exit();
        }
        return;
    }

    // Get all arguments
    $args = array_merge($_GET, $_POST);
    unset($args["oai_pmh"]); // Remove our custom query var

    try {
        // Route to appropriate handler
        switch ($verb) {
            case "Identify":
                handle_identify($args);
                break;
            case "ListMetadataFormats":
                handle_list_metadata_formats($args);
                break;
            case "ListSets":
                handle_list_sets($args);
                break;
            case "GetRecord":
                handle_get_record($args);
                break;
            case "ListIdentifiers":
                handle_list_identifiers($args);
                break;
            case "ListRecords":
                handle_list_records($args);
                break;
        }
    } catch (\Exception $e) {
        error_log("OAI-PMH Error: " . $e->getMessage());
        output_oai_error("badArgument", "Internal server error");
    }

    if (!defined("WP_TESTS_DOMAIN")) {
        exit();
    }
}

/**
 * Output common OAI-PMH XML headers
 */
function output_oai_header($verb, $args = [])
{
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"' . "\n";
    echo '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' .
        "\n";
    echo '         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/' .
        "\n";
    echo '         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">' . "\n";

    // Response date in UTC
    echo "  <responseDate>" .
        gmdate("Y-m-d\TH:i:s\Z") .
        "</responseDate>" .
        "\n";

    // Request element
    $base_url = get_oai_base_url();
    echo "  <request";
    if (!empty($verb)) {
        echo ' verb="' . esc_attr($verb) . '"';
    }
    foreach ($args as $key => $value) {
        if ($key !== "verb" && !empty($value)) {
            echo " " . esc_attr($key) . '="' . esc_attr($value) . '"';
        }
    }
    echo ">" . esc_html($base_url) . "</request>" . "\n";
}

/**
 * Output OAI-PMH XML footer
 */
function output_oai_footer()
{
    echo "</OAI-PMH>" . "\n";
}

/**
 * Output OAI-PMH error response
 */
function output_oai_error($code, $message = "")
{
    output_oai_header("", []);
    echo '  <error code="' . esc_attr($code) . '">';
    if (!empty($message)) {
        echo esc_html($message);
    }
    echo "</error>" . "\n";
    output_oai_footer();
}

/**
 * Get the base URL for OAI-PMH requests
 */
function get_oai_base_url()
{
    $base_url = home_url("/oai-pmh/");
    return $base_url;
}

/**
 * Handle OAI-PMH Identify verb
 */
function handle_identify($args)
{
    // Check for illegal arguments
    $allowed_args = ["verb"];
    foreach ($args as $key => $value) {
        if (!in_array($key, $allowed_args)) {
            output_oai_error("badArgument", "Illegal argument: $key");
            return;
        }
    }

    output_oai_header("Identify", $args);

    echo "  <Identify>" . "\n";
    echo "    <repositoryName>" .
        esc_html(get_bloginfo("name")) .
        " - Museum Collection</repositoryName>" .
        "\n";
    echo "    <baseURL>" . esc_html(get_oai_base_url()) . "</baseURL>" . "\n";
    echo "    <protocolVersion>2.0</protocolVersion>" . "\n";
    echo "    <adminEmail>" .
        esc_html(get_option("admin_email")) .
        "</adminEmail>" .
        "\n";

    // Get earliest datestamp from objects
    $earliest_date = get_earliest_object_date();
    echo "    <earliestDatestamp>" .
        $earliest_date .
        "</earliestDatestamp>" .
        "\n";

    echo "    <deletedRecord>no</deletedRecord>" . "\n";
    echo "    <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>" . "\n";
    echo "  </Identify>" . "\n";

    output_oai_footer();
}

/**
 * Handle OAI-PMH ListMetadataFormats verb
 */
function handle_list_metadata_formats($args)
{
    $allowed_args = ["verb", "identifier"];
    foreach ($args as $key => $value) {
        if (!in_array($key, $allowed_args)) {
            output_oai_error("badArgument", "Illegal argument: $key");
            return;
        }
    }

    // If identifier is provided, check if it exists
    if (!empty($args["identifier"])) {
        $post = get_post_by_oai_identifier($args["identifier"]);
        if (!$post) {
            output_oai_error("idDoesNotExist", "The identifier does not exist");
            return;
        }
    }

    output_oai_header("ListMetadataFormats", $args);

    echo "  <ListMetadataFormats>" . "\n";
    echo "    <metadataFormat>" . "\n";
    echo "      <metadataPrefix>oai_dc</metadataPrefix>" . "\n";
    echo "      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>" .
        "\n";
    echo "      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>" .
        "\n";
    echo "    </metadataFormat>" . "\n";
    echo "  </ListMetadataFormats>" . "\n";

    output_oai_footer();
}

/**
 * Handle OAI-PMH ListSets verb
 */
function handle_list_sets($args)
{
    $allowed_args = ["verb", "resumptionToken"];
    foreach ($args as $key => $value) {
        if (!in_array($key, $allowed_args)) {
            output_oai_error("badArgument", "Illegal argument: $key");
            return;
        }
    }

    // Get collections (sets)
    $collections = get_posts([
        "post_type" => WPM_PREFIX . "collection",
        "post_status" => "publish",
        "posts_per_page" => -1,
        "orderby" => "title",
        "order" => "ASC",
    ]);

    if (empty($collections)) {
        output_oai_error(
            "noSetHierarchy",
            "This repository does not support sets"
        );
        return;
    }

    output_oai_header("ListSets", $args);

    echo "  <ListSets>" . "\n";

    foreach ($collections as $collection) {
        $set_spec = "collection:" . $collection->post_name;
        echo "    <set>" . "\n";
        echo "      <setSpec>" . esc_html($set_spec) . "</setSpec>" . "\n";
        echo "      <setName>" .
            esc_html($collection->post_title) .
            "</setName>" .
            "\n";
        if (!empty($collection->post_excerpt)) {
            echo "      <setDescription>" . "\n";
            echo '        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"' .
                "\n";
            echo '                   xmlns:dc="http://purl.org/dc/elements/1.1/"' .
                "\n";
            echo '                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' .
                "\n";
            echo '                   xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/' .
                "\n";
            echo '                   http://www.openarchives.org/OAI/2.0/oai_dc.xsd">' .
                "\n";
            echo "          <dc:description>" .
                esc_html($collection->post_excerpt) .
                "</dc:description>" .
                "\n";
            echo "        </oai_dc:dc>" . "\n";
            echo "      </setDescription>" . "\n";
        }
        echo "    </set>" . "\n";
    }

    echo "  </ListSets>" . "\n";

    output_oai_footer();
}

/**
 * Handle OAI-PMH GetRecord verb
 */
function handle_get_record($args)
{
    $allowed_args = ["verb", "identifier", "metadataPrefix"];
    $required_args = ["identifier", "metadataPrefix"];

    // Check for required arguments
    foreach ($required_args as $arg) {
        if (empty($args[$arg])) {
            output_oai_error("badArgument", "Missing required argument: $arg");
            return;
        }
    }

    // Check for illegal arguments
    foreach ($args as $key => $value) {
        if (!in_array($key, $allowed_args)) {
            output_oai_error("badArgument", "Illegal argument: $key");
            return;
        }
    }

    // Validate metadata prefix
    if ($args["metadataPrefix"] !== "oai_dc") {
        output_oai_error(
            "cannotDisseminateFormat",
            "Unsupported metadata format"
        );
        return;
    }

    // Get the post
    $post = get_post_by_oai_identifier($args["identifier"]);
    if (!$post) {
        output_oai_error("idDoesNotExist", "The identifier does not exist");
        return;
    }

    // Check if post has OAI-PMH mappings
    if (!post_has_oai_mappings($post)) {
        output_oai_error(
            "cannotDisseminateFormat",
            "No OAI-PMH mappings configured for this object type"
        );
        return;
    }

    output_oai_header("GetRecord", $args);

    echo "  <GetRecord>" . "\n";
    output_record($post);
    echo "  </GetRecord>" . "\n";

    output_oai_footer();
}

/**
 * Handle OAI-PMH ListIdentifiers verb
 */
function handle_list_identifiers($args)
{
    $allowed_args = [
        "verb",
        "from",
        "until",
        "set",
        "metadataPrefix",
        "resumptionToken",
    ];

    // Handle resumption token
    if (!empty($args["resumptionToken"])) {
        // If resumption token is provided, it should be the only argument besides verb
        foreach ($args as $key => $value) {
            if ($key !== "verb" && $key !== "resumptionToken") {
                output_oai_error(
                    "badArgument",
                    "resumptionToken must be the only argument"
                );
                return;
            }
        }
        // For now, we don't implement resumption tokens
        output_oai_error(
            "badResumptionToken",
            "Resumption tokens not implemented"
        );
        return;
    }

    // metadataPrefix is required when no resumption token
    $required_args = ["metadataPrefix"];

    // Check for required arguments
    foreach ($required_args as $arg) {
        if (empty($args[$arg])) {
            output_oai_error("badArgument", "Missing required argument: $arg");
            return;
        }
    }

    // Check for illegal arguments
    foreach ($args as $key => $value) {
        if (!in_array($key, $allowed_args)) {
            output_oai_error("badArgument", "Illegal argument: $key");
            return;
        }
    }

    // Validate metadata prefix
    if ($args["metadataPrefix"] !== "oai_dc") {
        output_oai_error(
            "cannotDisseminateFormat",
            "Unsupported metadata format"
        );
        return;
    }

    // Validate from and until dates
    if (!empty($args["from"])) {
        $from_date = validate_oai_date($args["from"]);
        if (!$from_date) {
            output_oai_error(
                "badArgument",
                "Invalid date format for 'from' parameter"
            );
            return;
        }
    }

    if (!empty($args["until"])) {
        $until_date = validate_oai_date($args["until"]);
        if (!$until_date) {
            output_oai_error(
                "badArgument",
                "Invalid date format for 'until' parameter"
            );
            return;
        }
    }

    // Check that from and until have the same granularity
    if (!empty($args["from"]) && !empty($args["until"])) {
        $from_is_datetime = strpos($args["from"], "T") !== false;
        $until_is_datetime = strpos($args["until"], "T") !== false;

        if ($from_is_datetime !== $until_is_datetime) {
            output_oai_error(
                "badArgument",
                "Arguments 'from' and 'until' must have the same granularity"
            );
            return;
        }
    }

    // Get records based on criteria
    $posts = get_oai_posts($args);

    if (empty($posts)) {
        output_oai_error(
            "noRecordsMatch",
            "No records match the given criteria"
        );
        return;
    }

    output_oai_header("ListIdentifiers", $args);

    echo "  <ListIdentifiers>" . "\n";

    foreach ($posts as $post) {
        output_header($post);
    }

    echo "  </ListIdentifiers>" . "\n";

    output_oai_footer();
}

/**
 * Handle OAI-PMH ListRecords verb
 */
function handle_list_records($args)
{
    $allowed_args = [
        "verb",
        "from",
        "until",
        "set",
        "metadataPrefix",
        "resumptionToken",
    ];

    // Handle resumption token
    if (!empty($args["resumptionToken"])) {
        // If resumption token is provided, it should be the only argument besides verb
        foreach ($args as $key => $value) {
            if ($key !== "verb" && $key !== "resumptionToken") {
                output_oai_error(
                    "badArgument",
                    "resumptionToken must be the only argument"
                );
                return;
            }
        }
        // For now, we don't implement resumption tokens
        output_oai_error(
            "badResumptionToken",
            "Resumption tokens not implemented"
        );
        return;
    }

    // metadataPrefix is required when no resumption token
    $required_args = ["metadataPrefix"];

    // Check for required arguments
    foreach ($required_args as $arg) {
        if (empty($args[$arg])) {
            output_oai_error("badArgument", "Missing required argument: $arg");
            return;
        }
    }

    // Check for illegal arguments
    foreach ($args as $key => $value) {
        if (!in_array($key, $allowed_args)) {
            output_oai_error("badArgument", "Illegal argument: $key");
            return;
        }
    }

    // Validate metadata prefix
    if ($args["metadataPrefix"] !== "oai_dc") {
        output_oai_error(
            "cannotDisseminateFormat",
            "Unsupported metadata format"
        );
        return;
    }

    // Validate from and until dates
    if (!empty($args["from"])) {
        $from_date = validate_oai_date($args["from"]);
        if (!$from_date) {
            output_oai_error(
                "badArgument",
                "Invalid date format for 'from' parameter"
            );
            return;
        }
    }

    if (!empty($args["until"])) {
        $until_date = validate_oai_date($args["until"]);
        if (!$until_date) {
            output_oai_error(
                "badArgument",
                "Invalid date format for 'until' parameter"
            );
            return;
        }
    }

    // Check that from and until have the same granularity
    if (!empty($args["from"]) && !empty($args["until"])) {
        $from_is_datetime = strpos($args["from"], "T") !== false;
        $until_is_datetime = strpos($args["until"], "T") !== false;

        if ($from_is_datetime !== $until_is_datetime) {
            output_oai_error(
                "badArgument",
                "Arguments 'from' and 'until' must have the same granularity"
            );
            return;
        }
    }

    // Get records based on criteria
    $posts = get_oai_posts($args);

    if (empty($posts)) {
        output_oai_error(
            "noRecordsMatch",
            "No records match the given criteria"
        );
        return;
    }

    output_oai_header("ListRecords", $args);

    echo "  <ListRecords>" . "\n";

    foreach ($posts as $post) {
        output_record($post);
    }

    echo "  </ListRecords>" . "\n";

    output_oai_footer();
}

/**
 * Get posts for OAI-PMH based on criteria
 */
function get_oai_posts($args)
{
    $query_args = [
        "post_type" => get_object_type_names(),
        "post_status" => "publish",
        "posts_per_page" => -1,
        "orderby" => "modified",
        "order" => "ASC",
    ];

    // Handle date range filtering
    if (!empty($args["from"]) || !empty($args["until"])) {
        $date_query = [];

        if (!empty($args["from"])) {
            $from_date = validate_oai_date($args["from"]);
            if (!$from_date) {
                return [];
            }
            $date_query["after"] = $from_date;
            $date_query["inclusive"] = true;
        }

        if (!empty($args["until"])) {
            $until_date = validate_oai_date($args["until"]);
            if (!$until_date) {
                return [];
            }
            $date_query["before"] = $until_date;
            $date_query["inclusive"] = true;
        }

        $query_args["date_query"] = [$date_query];
    }

    // Handle set filtering
    if (!empty($args["set"])) {
        $set_spec = $args["set"];
        if (strpos($set_spec, "collection:") === 0) {
            $collection_slug = substr($set_spec, strlen("collection:"));
            $collection = get_collection_by_slug($collection_slug);
            if ($collection) {
                // Get objects in this collection
                $collection_term_id = get_post_meta(
                    $collection->ID,
                    WPM_PREFIX . "collection_term_id",
                    true
                );
                if ($collection_term_id) {
                    $query_args["tax_query"] = [
                        [
                            "taxonomy" => WPM_PREFIX . "collection_tax",
                            "field" => "term_id",
                            "terms" => $collection_term_id,
                            "include_children" => true,
                        ],
                    ];
                }
            }
        }
    }

    $posts = get_posts($query_args);

    // Filter out posts that don't have OAI-PMH mappings
    $filtered_posts = [];
    foreach ($posts as $post) {
        if (post_has_oai_mappings($post)) {
            $filtered_posts[] = $post;
        }
    }

    return $filtered_posts;
}

/**
 * Check if a post has OAI-PMH mappings
 */
function post_has_oai_mappings($post)
{
    $kinds = get_mobject_kinds();

    foreach ($kinds as $kind) {
        if ($kind->type_name === $post->post_type) {
            if (!$kind->has_oai_pmh_mappings()) {
                return false;
            }

            // Check if this post has a valid OAI identifier
            $identifier = get_oai_identifier($post);
            return !empty($identifier);
        }
    }

    return false;
}

/**
 * Get post by OAI identifier
 */
function get_post_by_oai_identifier($identifier)
{
    $kinds = get_mobject_kinds();

    foreach ($kinds as $kind) {
        if (!$kind->has_oai_pmh_mappings()) {
            continue;
        }

        $mappings = $kind->get_oai_pmh_mappings();
        $search_identifier = $identifier;

        // Check if there's an identifier prefix
        if (!empty($mappings->identifier_prefix)) {
            $prefix = $mappings->identifier_prefix;
            // If the identifier starts with the prefix, strip it off
            if (strpos($identifier, $prefix) === 0) {
                $search_identifier = substr($identifier, strlen($prefix));
            } else {
                // If identifier doesn't start with expected prefix, skip this kind
                continue;
            }
        }

        // Try to get the object post using the search identifier
        $post = get_object_post_from_id($kind, $search_identifier);

        if ($post) {
            return $post;
        }
    }
    return null;
}

/**
 * Get OAI identifier for a post using mappings
 */
function get_oai_identifier($post)
{
    $kind = kind_from_type($post->post_type);
    if (!$kind) {
        return null;
    }

    $mappings = $kind->get_oai_pmh_mappings();
    if (!$mappings || !isset($mappings->identifier)) {
        return null;
    }

    $identifier_mapping = $mappings->identifier;
    $value = "";

    if (!empty($identifier_mapping["staticValue"])) {
        $value = $identifier_mapping["staticValue"];
    } elseif (!empty($identifier_mapping["field"])) {
        $value = get_post_meta($post->ID, $identifier_mapping["field"], true);
        if (empty($value)) {
            $value = $kind->get_wordpress_post_field_value(
                $post->ID,
                $identifier_mapping["field"]
            );
        }
    }

    if (empty($value)) {
        return null;
    }

    // Apply identifier prefix if present
    if (!empty($mappings->identifier_prefix)) {
        $value = $mappings->identifier_prefix . $value;
    }

    return $value;
}

/**
 * Output OAI record header
 */
function output_header($post)
{
    $identifier = get_oai_identifier($post);
    if (!$identifier) {
        return; // Skip posts without identifiers
    }
    $datestamp = gmdate("Y-m-d\TH:i:s\Z", strtotime($post->post_date));

    echo "    <header>" . "\n";
    echo "      <identifier>" . esc_html($identifier) . "</identifier>" . "\n";
    echo "      <datestamp>" . $datestamp . "</datestamp>" . "\n";

    // Add set specs for collections
    $collection_terms = wp_get_object_terms(
        $post->ID,
        WPM_PREFIX . "collection_tax"
    );
    foreach ($collection_terms as $term) {
        $collection_post = get_posts([
            "post_type" => WPM_PREFIX . "collection",
            "meta_key" => WPM_PREFIX . "collection_term_id",
            "meta_value" => $term->term_id,
            "posts_per_page" => 1,
        ]);
        if (!empty($collection_post)) {
            $set_spec = "collection:" . $collection_post[0]->post_name;
            echo "      <setSpec>" . esc_html($set_spec) . "</setSpec>" . "\n";
        }
    }

    echo "    </header>" . "\n";
}

/**
 * Output complete OAI record
 */
function output_record($post)
{
    echo "    <record>" . "\n";
    output_header($post);
    output_metadata($post);
    echo "    </record>" . "\n";
}

/**
 * Output Dublin Core metadata for a post
 */
function output_metadata($post)
{
    $kinds = get_mobject_kinds();
    $kind = null;

    foreach ($kinds as $k) {
        if ($k->type_name === $post->post_type) {
            $kind = $k;
            break;
        }
    }

    if (!$kind || !$kind->has_oai_pmh_mappings()) {
        return;
    }

    $mappings = $kind->get_oai_pmh_mappings();

    echo "    <metadata>" . "\n";
    echo '      <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"' .
        "\n";
    echo '                 xmlns:dc="http://purl.org/dc/elements/1.1/"' . "\n";
    echo '                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' .
        "\n";
    echo '                 xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/' .
        "\n";
    echo '                 http://www.openarchives.org/OAI/2.0/oai_dc.xsd">' .
        "\n";

    // Dublin Core fields
    $dc_fields = [
        "title",
        "creator",
        "subject",
        "description",
        "publisher",
        "contributor",
        "date",
        "type",
        "format",
        "identifier",
        "source",
        "language",
        "relation",
        "coverage",
        "rights",
    ];

    foreach ($dc_fields as $dc_field) {
        $mapping = $mappings->$dc_field ?? null;
        if (
            $mapping &&
            (isset($mapping["field"]) || isset($mapping["staticValue"]))
        ) {
            $value = "";

            if (!empty($mapping["staticValue"])) {
                $value = $mapping["staticValue"];
            } elseif (!empty($mapping["field"])) {
                $value = get_post_meta($post->ID, $mapping["field"], true);
                if (empty($value)) {
                    $value = $kind->get_wordpress_post_field_value(
                        $post->ID,
                        $mapping["field"]
                    );
                }
            }

            if (!empty($value)) {
                // Apply identifier prefix if this is the identifier field
                if ($dc_field === "identifier") {
                    $value = get_oai_identifier($post);
                }

                if (is_array($value)) {
                    foreach ($value as $v) {
                        echo "        <dc:" .
                            $dc_field .
                            ">" .
                            esc_html($v) .
                            "</dc:" .
                            $dc_field .
                            ">" .
                            "\n";
                    }
                } else {
                    echo "        <dc:" .
                        $dc_field .
                        ">" .
                        esc_html($value) .
                        "</dc:" .
                        $dc_field .
                        ">" .
                        "\n";
                }
            }
        }
    }

    echo "      </oai_dc:dc>" . "\n";
    echo "    </metadata>" . "\n";
}

/**
 * Get the earliest object creation date
 */
function get_earliest_object_date()
{
    $posts = get_posts([
        "post_type" => get_object_type_names(),
        "post_status" => "publish",
        "posts_per_page" => 1,
        "orderby" => "date",
        "order" => "ASC",
    ]);

    if (empty($posts)) {
        return gmdate("Y-m-d\TH:i:s\Z");
    }

    return gmdate("Y-m-d\TH:i:s\Z", strtotime($posts[0]->post_date));
}

/**
 * Validate OAI date format
 */
function validate_oai_date($date)
{
    // Support both YYYY-MM-DD and YYYY-MM-DDThh:mm:ssZ formats
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return $date;
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $date)) {
        return substr($date, 0, 10); // Convert to date for WordPress date_query
    }

    return false;
}

/**
 * Generate a sanitized domain prefix for OAI-PMH identifiers
 * Converts domain like "https://utsic.utoronto.ca" to "utsic-utoronto-ca"
 */
function get_default_oai_identifier_prefix()
{
    $site_url = get_site_url();
    $parsed_url = parse_url($site_url);

    if (!$parsed_url || !isset($parsed_url["host"])) {
        return "site";
    }

    $domain = $parsed_url["host"];

    // Remove www. prefix if present
    if (strpos($domain, "www.") === 0) {
        $domain = substr($domain, 4);
    }

    // Replace dots with hyphens and ensure it's URL-safe
    $prefix = str_replace(".", "-", $domain);
    $prefix = preg_replace("/[^a-zA-Z0-9\-]/", "", $prefix);
    $prefix = trim($prefix, "-");

    return $prefix . ":";
}
