<?php
/**
 * Class representing OAI-PMH Dublin Core metadata field mappings for a museum object kind.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Class representing OAI-PMH Dublin Core metadata field mappings.
 */
class OaiPmhMappings
{
    /**
     * Title field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $title
     */
    public $title;

    /**
     * Creator field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $creator
     */
    public $creator;

    /**
     * Subject field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $subject
     */
    public $subject;

    /**
     * Description field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $description
     */
    public $description;

    /**
     * Publisher field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $publisher
     */
    public $publisher;

    /**
     * Contributor field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $contributor
     */
    public $contributor;

    /**
     * Date field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $date
     */
    public $date;

    /**
     * Type field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $type
     */
    public $type;

    /**
     * Format field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $format
     */
    public $format;

    /**
     * Identifier field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $identifier
     */
    public $identifier;

    /**
     * Source field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $source
     */
    public $source;

    /**
     * Language field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $language
     */
    public $language;

    /**
     * Relation field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $relation
     */
    public $relation;

    /**
     * Coverage field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $coverage
     */
    public $coverage;

    /**
     * Rights field mapping.
     * Array with 'field' and 'staticValue' keys.
     *
     * @var array $rights
     */
    public $rights;

    /**
     * Identifier prefix to be prepended to all identifiers.
     *
     * @var string $identifier_prefix
     */
    public $identifier_prefix;

    /**
     * Constructor.
     */
    public function __construct()
    {
        $this->initialize_empty_mappings();
    }

    /**
     * Initialize all fields with empty mappings.
     */
    public function initialize_empty_mappings()
    {
        $empty_mapping = [
            "field" => "",
            "staticValue" => "",
        ];

        $this->title = $empty_mapping;
        $this->creator = $empty_mapping;
        $this->subject = $empty_mapping;
        $this->description = $empty_mapping;
        $this->publisher = $empty_mapping;
        $this->contributor = $empty_mapping;
        $this->date = $empty_mapping;
        $this->type = $empty_mapping;
        $this->format = $empty_mapping;
        $this->identifier = $empty_mapping;
        $this->source = $empty_mapping;
        $this->language = $empty_mapping;
        $this->relation = $empty_mapping;
        $this->coverage = $empty_mapping;
        $this->rights = $empty_mapping;
        $this->identifier_prefix = "";
    }

    /**
     * Get list of all Dublin Core field names.
     *
     * @return array Array of field names.
     */
    public function get_dc_field_names()
    {
        return [
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
    }

    /**
     * Create a new instance from a JSON string.
     *
     * @param string $json_string JSON string containing mappings data.
     * @return OaiPmhMappings A new instance of OaiPmhMappings.
     */
    public static function from_json($json_string)
    {
        $instance = new self();

        if (empty($json_string)) {
            return $instance;
        }

        $data = json_decode($json_string, true);

        if (!is_array($data)) {
            return $instance;
        }

        $instance->populate_from_array($data);

        return $instance;
    }

    /**
     * Create a new instance from an associative array.
     *
     * @param array $mappings_array Associative array containing mappings data.
     * @return OaiPmhMappings A new instance of OaiPmhMappings.
     */
    public static function from_array($mappings_array)
    {
        $instance = new self();

        if (!is_array($mappings_array)) {
            return $instance;
        }

        $instance->populate_from_array($mappings_array);

        return $instance;
    }

    /**
     * Create a new instance from a stdClass object.
     *
     * @param stdClass $mappings_object stdClass object containing mappings data.
     * @return OaiPmhMappings A new instance of OaiPmhMappings.
     */
    public static function from_std_object($mappings_object)
    {
        $instance = new self();

        if (!is_object($mappings_object)) {
            return $instance;
        }

        $instance->populate_from_std_object($mappings_object);

        return $instance;
    }

    /**
     * Populate instance from array data.
     *
     * @param array $data Array containing mappings data.
     */
    public function populate_from_array($data)
    {
        $field_names = $this->get_dc_field_names();

        foreach ($field_names as $field_name) {
            if (isset($data[$field_name])) {
                $this->set_mapping($field_name, $data[$field_name]);
            }
        }

        // Handle identifier prefix
        if (isset($data["identifier_prefix"])) {
            $this->identifier_prefix = trim($data["identifier_prefix"]);
        }
    }

    /**
     * Populate instance from stdClass object.
     *
     * @param stdClass $mappings_object stdClass object containing mappings data.
     */
    public function populate_from_std_object($mappings_object)
    {
        $field_names = $this->get_dc_field_names();

        foreach ($field_names as $field_name) {
            if (isset($mappings_object->$field_name)) {
                $this->set_mapping($field_name, $mappings_object->$field_name);
            }
        }

        // Handle identifier prefix
        if (isset($mappings_object->identifier_prefix)) {
            $this->identifier_prefix = trim(
                $mappings_object->identifier_prefix
            );
        }
    }

    /**
     * Set a mapping for a Dublin Core field.
     *
     * @param string $dc_field Dublin Core field name.
     * @param array|string $mapping Mapping data - either array with 'field' and 'staticValue' keys, or string for field slug.
     */
    public function set_mapping($dc_field, $mapping)
    {
        if (!property_exists($this, $dc_field)) {
            return;
        }

        $clean_mapping = [
            "field" => "",
            "staticValue" => "",
        ];

        if (is_string($mapping)) {
            // Legacy support - treat string as field slug
            $clean_mapping["field"] = trim($mapping);
        } elseif (is_array($mapping)) {
            if (isset($mapping["field"])) {
                $clean_mapping["field"] = trim($mapping["field"]);
            }
            if (isset($mapping["staticValue"])) {
                $clean_mapping["staticValue"] = trim($mapping["staticValue"]);
            }
        } elseif ($mapping instanceof \stdClass) {
            if (isset($mapping->field)) {
                $clean_mapping["field"] = trim($mapping->field);
            }
            if (isset($mapping->staticValue)) {
                $clean_mapping["staticValue"] = trim($mapping->staticValue);
            }
        }

        $this->$dc_field = $clean_mapping;
    }

    /**
     * Get a mapping for a Dublin Core field.
     *
     * @param string $dc_field Dublin Core field name.
     * @return array|null Mapping data or null if not valid field.
     */
    public function get_mapping($dc_field)
    {
        if (!property_exists($this, $dc_field)) {
            return null;
        }

        return $this->$dc_field;
    }

    /**
     * Remove a mapping for a Dublin Core field.
     *
     * @param string $dc_field Dublin Core field name.
     */
    public function remove_mapping($dc_field)
    {
        if (property_exists($this, $dc_field)) {
            $this->$dc_field = [
                "field" => "",
                "staticValue" => "",
            ];
        }
    }

    /**
     * Check if a Dublin Core field has a mapping.
     *
     * @param string $dc_field Dublin Core field name.
     * @return bool True if mapping exists, false otherwise.
     */
    public function has_mapping($dc_field)
    {
        $mapping = $this->get_mapping($dc_field);
        if (!$mapping) {
            return false;
        }

        return !empty($mapping["field"]) || !empty($mapping["staticValue"]);
    }

    /**
     * Get the field slug for a Dublin Core field.
     *
     * @param string $dc_field Dublin Core field name.
     * @return string Field slug or empty string if not mapped to a field.
     */
    public function get_field_slug($dc_field)
    {
        $mapping = $this->get_mapping($dc_field);
        return $mapping ? $mapping["field"] : "";
    }

    /**
     * Get the static value for a Dublin Core field.
     *
     * @param string $dc_field Dublin Core field name.
     * @return string Static value or empty string if not set.
     */
    public function get_static_value($dc_field)
    {
        $mapping = $this->get_mapping($dc_field);
        return $mapping ? $mapping["staticValue"] : "";
    }

    /**
     * Check if a Dublin Core field is mapped to a kind field.
     *
     * @param string $dc_field Dublin Core field name.
     * @return bool True if mapped to a field, false otherwise.
     */
    public function is_mapped_to_field($dc_field)
    {
        $mapping = $this->get_mapping($dc_field);
        return $mapping && !empty($mapping["field"]);
    }

    /**
     * Check if a Dublin Core field has a static value.
     *
     * @param string $dc_field Dublin Core field name.
     * @return bool True if has static value, false otherwise.
     */
    public function has_static_value($dc_field)
    {
        $mapping = $this->get_mapping($dc_field);
        return $mapping && !empty($mapping["staticValue"]);
    }

    /**
     * Get all mappings as an associative array.
     *
     * @return array All mappings.
     */
    public function get_all_mappings()
    {
        $mappings = [];
        $field_names = $this->get_dc_field_names();

        foreach ($field_names as $field_name) {
            $mappings[$field_name] = $this->$field_name;
        }

        $mappings["identifier_prefix"] = $this->identifier_prefix;

        return $mappings;
    }

    /**
     * Clear all mappings.
     */
    public function clear_mappings()
    {
        $this->initialize_empty_mappings();
    }

    /**
     * Get the identifier prefix.
     *
     * @return string The identifier prefix.
     */
    public function get_identifier_prefix()
    {
        return $this->identifier_prefix;
    }

    /**
     * Set the identifier prefix.
     *
     * @param string $prefix The identifier prefix.
     */
    public function set_identifier_prefix($prefix)
    {
        $this->identifier_prefix = trim($prefix);
    }

    /**
     * Convert mappings to JSON string.
     *
     * @return string JSON representation of mappings.
     */
    public function to_json()
    {
        return wp_json_encode($this->get_all_mappings());
    }

    /**
     * Convert mappings to associative array.
     *
     * @return array Array representation of mappings.
     */
    public function to_array()
    {
        return $this->get_all_mappings();
    }

    /**
     * Get count of configured mappings.
     *
     * @return int Number of Dublin Core fields that have mappings.
     */
    public function get_mapping_count()
    {
        $count = 0;
        $field_names = $this->get_dc_field_names();

        foreach ($field_names as $field_name) {
            $mapping = $this->$field_name;
            if (!empty($mapping["field"]) || !empty($mapping["staticValue"])) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Validate all mappings against available kind fields.
     *
     * @param array $kind_fields Array of MObjectField objects or field data.
     * @return array Array of validation errors, empty if all valid.
     */
    public function validate_mappings($kind_fields = [])
    {
        $errors = [];
        $available_slugs = [];

        // Extract field slugs from kind fields
        foreach ($kind_fields as $field) {
            if (is_object($field) && property_exists($field, "slug")) {
                $available_slugs[] = $field->slug;
            } elseif (is_array($field) && isset($field["slug"])) {
                $available_slugs[] = $field["slug"];
            }
        }

        // Add WordPress post fields to available slugs
        $wordpress_fields = [
            "wp_post_title",
            "wp_post_excerpt",
            "wp_post_author",
            "wp_post_date",
            "wp_post_permalink",
            "wp_post_id",
        ];
        $available_slugs = array_merge($available_slugs, $wordpress_fields);

        // Check each mapping
        $field_names = $this->get_dc_field_names();
        foreach ($field_names as $field_name) {
            $mapping = $this->$field_name;

            if (
                !empty($mapping["field"]) &&
                !in_array($mapping["field"], $available_slugs, true)
            ) {
                $field_type = in_array($mapping["field"], $wordpress_fields)
                    ? "WordPress post field"
                    : "kind field";
                $errors[] = "Dublin Core field '{$field_name}' is mapped to non-existent {$field_type} '{$mapping["field"]}'";
            }

            if (!empty($mapping["field"]) && !empty($mapping["staticValue"])) {
                $errors[] = "Dublin Core field '{$field_name}' has both field mapping and static value set. Please choose one or the other.";
            }
        }

        return $errors;
    }
}
