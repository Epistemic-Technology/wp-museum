<?php
/**
 * Functions for interfacing with custom database tables (mobject_kinds & mobject_fields).
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Checks whether site database schema is up-to-date and updates if not.
 */
function db_version_check()
{
    // Skip database updates during tests to avoid schema conflicts
    if (defined("WP_TESTS_DOMAIN")) {
        return;
    }

    $version = get_site_option("wpm_db_version");
    if (DB_VERSION !== $version) {
        create_mobject_kinds_table();
        create_mobject_fields_table();
        create_remote_clients_table();
        update_option("wpm_db_version", DB_VERSION);
    }
}

/**
 * Create table for museum object kinds, or sync site table.
 */
function create_mobject_kinds_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $wpdb->show_errors = DB_SHOW_ERRORS;
    $sql = "CREATE TABLE $table_name (
        kind_id mediumint(9) NOT NULL AUTO_INCREMENT,
        cat_field_id mediumint(9),
        name varchar(255),
		type_name varchar(255),
        label varchar(255),
		label_plural varchar(255),
        description text,
        categorized tinyint(1),
        hierarchical tinyint(1),
        must_featured_image tinyint(1),
        must_gallery tinyint(1),
		exclude_from_search tinyint(1),
		strict_checking tinyint(1),
		parent_kind_id mediumint(9),
		oai_pmh_mappings text,
        PRIMARY KEY  (kind_id)
    );";

    require_once ABSPATH . "wp-admin/includes/upgrade.php";
    dbDelta($sql);
}

/**
 * Delete table for museum object kinds.
 */
function delete_mobject_kinds_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $wpdb->show_errors = DB_SHOW_ERRORS;
    return $wpdb->query(
        $wpdb->prepare("DROP TABLE IF EXISTS %i;", $table_name)
    );
}

/**
 * Create / sync table for museum object fields.
 */
function create_mobject_fields_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_fields";
    $wpdb->show_errors = DB_SHOW_ERRORS;
    $sql = "CREATE TABLE $table_name (
        field_id mediumint(9) NOT NULL AUTO_INCREMENT,
        slug varchar(255),
        kind_id mediumint(9),
        name varchar(255),
        type varchar(255),
        display_order int(5),
        public tinyint(1),
        required tinyint(1),
        quick_browse tinyint(1),
        help_text varchar(255),
		detailed_instructions text,
		public_description text,
        field_schema varchar(255),
		max_length int(5),
		dimensions varchar(255),
		units varchar(255),
		factors text,
        PRIMARY KEY  (field_id)
    );";

    require_once ABSPATH . "wp-admin/includes/upgrade.php";
    dbDelta($sql);
}

/**
 * Delete table for museum object fields table.
 */
function delete_mobject_fields_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_fields";
    $wpdb->show_errors = DB_SHOW_ERRORS;
    return $wpdb->query(
        $wpdb->prepare("DROP TABLE IF EXISTS %i;", $table_name)
    );
}

/**
 * Create / sync table for remote museum clients.
 */
function create_remote_clients_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "remote_clients";
    $wpdb->show_errors = DB_SHOW_ERRORS;
    $sql = "CREATE TABLE $table_name (
			client_id mediumint(9) NOT NULL AUTO_INCREMENT,
			uuid VARCHAR(36) UNIQUE,
			title TEXT,
			url TEXT,
			blocked BOOLEAN,
			registration_time DATETIME,
			PRIMARY KEY (client_id)
		);";
    require_once ABSPATH . "wp-admin/includes/upgrade.php";
    dbDelta($sql);
}

/**
 * Delete table for remote museum clients table.
 */
function delete_remote_clients_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "remote_clients";
    $wpdb->show_errors = DB_SHOW_ERRORS;
    return $wpdb->query("DROP TABLE IF EXISTS %i;", $table_name);
}

/**
 * Get museum object kind given id.
 *
 * @param   int/string/null $id  ID of kind in database.
 *
 * @return  object      Database entry for object as object.
 */
function get_kind($id)
{
    if (is_null($id)) {
        return null;
    }
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $kind = wp_cache_get("get_kind_" . $id, CACHE_GROUP);
    if (!$kind) {
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE kind_id=%s",
                $table_name,
                $id
            )
        );
        if (is_null($results) || 0 === count($results)) {
            return null;
        }
        $kind = new ObjectKind($results[0]);
        wp_cache_add("get_kind_" . $id, $kind, CACHE_GROUP);
    }
    return $kind;
}

/**
 * Get museum object kind given id.
 *
 * @param   string $type_name  Type name of kind.
 *
 * @return  object      Database entry for object as object.
 */
function get_kind_from_typename($type_name)
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $kind = wp_cache_get("get_kind_" . $type_name, CACHE_GROUP);
    if (!$kind) {
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE `type_name`=%s",
                $table_name,
                $type_name
            )
        );
        if (count($results) === 1) {
            $kind = new ObjectKind($results[0]);
        } else {
            return null;
        }
        wp_cache_add("get_kind_" . $type_name, $kind, CACHE_GROUP);
    }
    return $kind;
}

/**
 * Get museum object kinds's id with given name.
 *
 * @param   string $kind_name    The kinds's name.
 *
 * @return  string  The kinds's ID (a number).
 */
function get_kind_id($kind_name)
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $kind_id = wp_cache_get("get_kind_id_" . $kind_name, CACHE_GROUP);
    if (!$kind_id) {
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT kind_id FROM %i WHERE name=%s",
                $table_name,
                $kind_name
            )
        );
        $kind_id = $results[0]->kind_id;
        wp_cache_add("get_kind_id_" . $kind_name, $kind_id, CACHE_GROUP);
    }
    return $kind_id;
}

/**
 * Get object kind's name from ID.
 *
 * @param   string/int $kind_id  The ID of the object kind.
 *
 * @return  string      The object kind's name.
 */
function kind_name_from_id($kind_id)
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $kind_name = wp_cache_get("kind_name_from_id_" . $kind_id, CACHE_GROUP);
    if (!$kind_name) {
        $result = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT name FROM %i WHERE kind_id = %s",
                $table_name,
                $kind_id
            )
        );
        if (count($result) > 0) {
            $kind_name = $result[0]->name;
        } else {
            $kind_name = "";
        }
        wp_cache_add("kind_name_from_id_" . $kind_id, $kind_name, CACHE_GROUP);
    }
    return $kind_name;
}

/**
 * Get all museum object kinds from database.
 *
 * @return [ObjectKind] Array of kinds.
 */
function get_mobject_kinds()
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $kinds = wp_cache_get("get_mobject_kinds", CACHE_GROUP);
    if (!$kinds) {
        $results = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM %i", $table_name)
        );
        $kinds = [];
        foreach ($results as $result) {
            $kinds[] = new ObjectKind($result);
        }
        wp_cache_add("get_mobject_kinds", $kinds, CACHE_GROUP);
    }
    return $kinds;
}

/**
 * Get fields associated with a given object kind.
 *
 * @param   string/int $kind_id The ID of the object kind.
 * @param   bool       $only_public  Whether to only retrieve public fields.
 *
 * @return  Array   Array of MObjectField objects corresponding to rows of object field table.
 */
function get_mobject_fields($kind_id, $only_public = false)
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_fields";
    $fields = wp_cache_get("get_mobject_fields" . $kind_id, CACHE_GROUP);
    if (!$fields) {
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE kind_id=%s ORDER BY display_order",
                $table_name,
                $kind_id
            )
        );
        $fields = [];
        foreach ($results as $result) {
            $new_field = MObjectField::from_database($result);
            if (!$only_public || $new_field->public) {
                $fields[$new_field->slug] = $new_field;
            }
        }
        wp_cache_add("get_mobject_fields", $fields, CACHE_GROUP);
    }
    return $fields;
}

/**
 * Get single museum object field.
 *
 * @param string/int $kind_id The ID of the museum object kind.
 * @param string/int $field_id The ID of the field.
 *
 * @return MObjectField Field object corresponding to field table row.
 */
function get_mobject_field($kind_id, $field_id)
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_fields";
    $field = wp_cache_get(
        "get_mobject_field_" . $kind_id . "_" . $field_id,
        CACHE_GROUP
    );
    if (!$field) {
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE kind_id=%s AND field_id=%s ORDER BY display_order",
                $table_name,
                $kind_id,
                $field_id
            )
        );
        if (count($results) > 0) {
            $result = $results[0];
            $field = MObjectField::from_database($result);
        } else {
            $field = null;
        }
    }
    return $field;
}

/**
 * Update museum object kind in database.
 *
 * @param string/int         $kind_id    The object kind to be updated. Must exist in db.
 * @param ['field'=>'value'] $data       Array of field/value pairs.
 *
 * @return bool True if update is successful.
 */
function update_kind($kind_id, $data)
{
    if (-1 === $kind_id) {
        return -1;
    }
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    if (isset($data["label"])) {
        $data["name"] = ObjectKind::name_from_label($data["label"]);
    }
    return $wpdb->update($table_name, $data, ["kind_id" => $kind_id]);
}

/**
 * Delete museum object kind from database.
 *
 * @param string/int $kind_id The object kind to be deleted.
 *
 * @return bool True if delete is successful.
 */
function delete_kind($kind_id)
{
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $result = $wpdb->delete($table_name, ["kind_id" => $kind_id]);
    if ($result > 0) {
        $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_fields";
        $result = $wpdb->delete($table_name, ["kind_id" => $kind_id]);
        return true;
    }
    return false;
}

/**
 * Create new museum object kind.
 *
 * @param [field=>value] $data Associative array of options for the object.
 *
 * @return bool True if kind is inserted into the database successfully.
 */
function new_kind($data)
{
    if (!isset($data["label"]) || "" === $data["label"]) {
        return -1;
    }
    global $wpdb;
    $table_name = $wpdb->prefix . WPM_PREFIX . "mobject_kinds";
    $data["name"] = ObjectKind::name_from_label($data["label"]);
    $type_name = WPM_PREFIX . $data["name"];
    if (strlen($type_name) > 20) {
        $type_name = substr($type_name, 0, 19);
    }
    // Collision checking.
    $results = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT type_name FROM %i WHERE type_name LIKE %s",
            $table_name,
            "%" . $wpdb->esc_like($type_name) . "%"
        )
    );
    if (0 < count($results)) {
        $type_name = substr($type_name, 0, 18) . "_" . count($results);
    }
    $data["type_name"] = $type_name;
    $wpdb->insert($table_name, $data);
    return $wpdb->insert_id;
}

/**
 * Sorts a retrieved database row by its fields.
 *
 * @param [[string]] $row      The row, an associative array where the first element of each row is its content.
 * @param [StdObj]   $fields   Array of field objects with slug elements corresponding to row indexes.
 *
 * @return [string]     An array ordered the same as $fields containing the content for each field.
 */
function sort_row_by_fields($row, $fields)
{
    $sorted_row = [];
    foreach ($fields as $field) {
        $index = $field->slug;
        if (isset($row[$index])) {
            $sorted_row[] = $row[$index][0];
        } else {
            $sorted_row[] = "";
        }
    }
    return $sorted_row;
}
