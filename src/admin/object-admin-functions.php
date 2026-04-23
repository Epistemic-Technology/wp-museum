<?php
/**
 * Administration of object types.
 *
 * Adds pages to the dashboard (Settings|Museum Objects) for the creation and
 * administration of museum object post types. The first page allows administrators
 * to create new object types and shows existing object types. The second page
 * allows for the creation and editing of fields for a particular object.
 *
 * Each field has a name, type (short string, text, date, true/false), help text,
 * and optionally a schema. The schema is a regular expression with <a>, <b>, <c> etc.
 * placeholders that correspond to different subfields of the field. The schema
 * is currently used for sorting in the quick browse page---the field will be sorted
 * first by <a>, then <b>, etc. In the future, the schema could also be used for
 * validating input.
 *
 * The public, required, and quick checkboxes determine whether everyone (or just site
 * contributors) can see the field, whether the field is required when creating an object,
 * and whether the field appears in the quick browse table.
 *
 * @package MikeThicke\WPMuseum
 * @see object_post_types.php
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

// prefix for new fields created by javascript before being saved. Just has to be something
// unique.
const WPM_FIELD = 'wpm-new-field#';

/**
 * Creates the admin page and adds it to the Settings menu. Only accessible to administrators.
 *
 * @return void
 */
function add_object_admin_page(): void {
	add_submenu_page(
		'options-general.php',
		'WP Museum',
		'WP Museum',
		'manage_options',
		'wpm-objects-admin',
		__NAMESPACE__ . '\objects_admin_page'
	);
}

/**
 * Displays appropriate object administration page.
 *
 * Top-level function for object admin page that displays appropriate editing page depending on get parameter.
 *
 * @return void
 */
function objects_admin_page(): void {
	process_actions();

	if ( isset( $_GET['wpm-objects-page'] ) ) {
		if ( ! check_admin_referer( 'd78HG@YsELh2KByUgCTuDCepW', 'wpm-objects-admin-nonce' ) ) {
			wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
		}
		$wpm_page = sanitize_key( $_GET['wpm-objects-page'] );
	} else {
		$wpm_page = 'wpm-object-admin-main';
	}
	switch ( $wpm_page ) {
		case 'wpm-object-admin-main':
			display_object_admin_main();
			break;
		case 'wpm-new-object':
			edit_kind_form();
			break;
		case 'wpm-edit-kind':
			if ( isset( $_GET['oid'] ) ) {
				edit_kind_form( sanitize_key( $_GET['oid'] ) );
			} else {
				edit_kind_form();
			}
			break;
	}
}

/**
 * Displays the main object administration page.
 *
 * @return void
 */
function display_object_admin_main(): void {
	if ( isset( $_SERVER['PHP_SELF'] ) ) {
		$form_url = wp_unslash( $_SERVER['PHP_SELF'] ); // phpcs:ignore
	} else {
		$form_url = '';
	}
	echo (
		"<div class='wrap'>
			<h1>WordPress Museum Administration</h1>"
	);

	display_kinds_admin_section( $form_url );
	display_images_admin_section( $form_url );
	display_options_admin_section();
	echo '</div>';
}

/**
 * Displays the images administration section.
 *
 * @param string $form_url The URL for the form action.
 * @return void
 */
function display_images_admin_section(string $form_url): void {
	echo '<h2>Images</h2>';

	echo '<div id="image-backups-table">';
	display_image_backups_table();
	echo '</div>';

	$url = add_query_arg(
		[
			'page'                    => 'wpm-objects-admin',
			WPM_PREFIX . 'img_exp'    => '1',
			'wpm-objects-admin-nonce' => wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' ),
		],
		$form_url
	);
	echo '<div class="wpm-admin-bottom-buttons">';
	echo "<a class='button' id='image-new-backup'>New Backup</a>";
	echo '<div id="image-backup-status"><p>&nbsp;</p></div>';
	echo '</div>';
}

/**
 * Displays the kinds administration section.
 *
 * @param string $form_url The URL for the form action.
 * @return void
 */
function display_kinds_admin_section(string $form_url): void {
	$csv_url = add_query_arg(
		[
			'page'                    => 'wpm-objects-admin',
			'action'                  => 'csv_upload',
			'wpm-objects-admin-nonce' => wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' ),
		],
		$form_url
	);
	// CSV upload form based on Add Plugin form for uploading plugins as zipfiles (plugin-install.php).
	echo(
		"<div id='kinds-admin-section'>
		<h2>Museum Objects</h2>"
	);
	display_csv_upload_form( $csv_url );
	echo(
		"<table class='widefat striped wp-list-table wpm-object' id='kinds-admin-table'>
		<tr>
			<th>Object Type</th>
			<th>Total Objects</th>
			<th>Published Objects</th>
			<th>Actions</th>
		</tr>"
	);
	$kinds = get_mobject_kinds();
	foreach ( $kinds as $kind ) {
		$fields                  = get_mobject_fields( $kind->kind_id );
		$all_mobject_posts       = get_posts(
			[
				'numberposts' => -1,
				'post_type'   => $kind->type_name,
				'post_status' => 'any',
			]
		);
		$published_mobject_posts = get_posts(
			[
				'numberposts' => -1,
				'post_type'   => $kind->type_name,
				'post_status' => 'publish',
			]
		);
		$url                     = add_query_arg(
			[
				'page'                    => 'wpm-objects-admin',
				'wpm-objects-page'        => 'wpm-edit-kind',
				'oid'                     => $kind->kind_id,
				'wpm-objects-admin-nonce' => wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' ),
			],
			$form_url
		);
		// phpcs:ignore
		echo "<tr id='kind-row-{$kind->kind_id}'>";
		echo '<td>' . esc_html( $kind->label ) . '</td>';
		echo '<td>' . esc_html( count( $all_mobject_posts ) ) . '</td>';
		echo '<td>' . esc_html( count( $published_mobject_posts ) ) . '</td>';
		echo '<td>';
		echo "<a class='button' href='" . esc_url( $url ) . "'>Edit</a> ";
		echo '<a class="button delete-kind-button" data-kind-id="' . esc_html( $kind->kind_id ) . '">Delete</a> ';
		export_csv_button( $kind->kind_id );
		echo ' ';
		import_csv_button( $kind->kind_id );
		echo '</td>';
		echo '</tr>';
	}
	echo '</table>';
	if ( count( $kinds ) < 1 ) {
		echo "<div class='empty-table-notification'>There are currently no object types.</div>";
	}
	echo "<div id='wpm-object-bottom-buttons' class='wpm-admin-bottom-buttons'>";
	$url = add_query_arg(
		[
			'page'                    => 'wpm-objects-admin',
			'wpm-objects-page'        => 'wpm-new-object',
			'wpm-objects-admin-nonce' => wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' ),
		],
		$form_url
	);
	echo "<a class='button' href='" . esc_url( $url ) . "'>Add New</a>";
	echo '</div>';
	echo '</div>';
}

$wpm_test = WPM_PREFIX;

/**
 * Displays the options administration section.
 *
 * @return void
 */
function display_options_admin_section(): void {

	/**
	 * Set up data.
	 */
	if ( ! get_option( WPM_PREFIX . 'collection_override_category' ) ) {
		add_option( WPM_PREFIX . 'collection_override_category', 0 );
	}
	/**
	 * Process submitted form.
	 */
	if ( isset( $_POST['save-wpm-objects-admin-options'] ) ) {
		if ( ! isset( $_POST['wpm-objects-admin-nonce'] ) ||
			! check_admin_referer( 'd78HG@YsELh2KByUgCTuDCepW', 'wpm-objects-admin-nonce' ) ) {
			wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
		}

		if ( isset( $_POST[ WPM_PREFIX . 'collection_override_category' ] ) && '1' === $_POST[ WPM_PREFIX . 'collection_override_category' ] ) {
			update_option( WPM_PREFIX . 'collection_override_category', 1 );
		} else {
			update_option( WPM_PREFIX . 'collection_override_category', 0 );
		}
	}

	if ( isset( $_SERVER['PHP_SELF'] ) ) {
		$form_action = sanitize_url( wp_unslash( $_SERVER['PHP_SELF'] ) ) . '?page=wpm-objects-admin';
	} else {
		$form_action = '';
	}

	echo '<h2>Options</h2>';
	echo "<form name='object_admin_options' method='post' action='" . esc_html( $form_action ) . "'>";
	wp_nonce_field( 'd78HG@YsELh2KByUgCTuDCepW', 'wpm-objects-admin-nonce' );
	echo "<input type='checkbox' name='" . esc_html( WPM_PREFIX ) . "collection_override_category' id='wpm_collection_override_category' value='1'";
	if ( intval( get_option( WPM_PREFIX . 'collection_override_category' ) ) === 1 ) {
		echo ' checked';
	}
	echo "><label for='wpm_collection_override_category'>Show collection page for associated category listings</label><br /><br />";
	echo "<input type='submit' class='button button-primary button-large' name='save-wpm-objects-admin-options' value='Save Options'>";
	echo '</form>';
}

/**
 * Displays the image backups table.
 *
 * @return void
 */
function display_image_backups_table(): void {
	$dir_info = wp_upload_dir();
	if ( ! $dir_info ) {
		return;
	}
	$zip_dir     = $dir_info['basedir'] . DIRECTORY_SEPARATOR . IMAGE_DIR;
	$zip_dir_url = $dir_info['baseurl'] . '/' . IMAGE_DIR;
	echo(
		'<table class="widefat striped wp-list-table wpm-object" id="image-backup-table">
		<tr>
			<th>File</th>
			<th>Date</th>
			<th>Size</th>
			<th>Actions</th>
		</tr>'
	);
	foreach ( scandir( $zip_dir )  as $item ) {
		$allowed_extensions = [ 'zip' ];
		if ( in_array( pathinfo( $item, PATHINFO_EXTENSION ), $allowed_extensions, true ) ) {
			$info          = stat( $zip_dir . DIRECTORY_SEPARATOR . $item );
			$date_modified = gmdate( 'Y-m-d', $info['mtime'] );
			if ( $info['size'] < 1000000 ) {
				$size_text = round( $info['size'] / 1000 ) . ' kB';
			} else {
				$size_text = round( $info['size'] / 1000000 ) . ' mB';
			}
			$download_url = $zip_dir_url . '/' . $item;
			$row_id       = 'backup-row-' . str_replace( '.', '_', $item );
			echo "<tr id='" . esc_html( $row_id ) . "'>";
			echo '<td>' . esc_html( $item ) . '</td>';
			echo '<td>' . esc_html( $date_modified ) . '</td>';
			echo '<td>' . esc_html( $size_text ) . '</td>';
			echo '<td>';
			echo "<a class='button' href='" . esc_url( $download_url ) . "'>Download</a> ";
			echo "<a class='button delete-zip-button' data-zip-item='" . esc_html( $item ) . "'>Delete</a>";
			echo '</td>';
			echo '</tr>';
		}
	}
	echo '</table>';
}

/**
 * AJAX handler for deleting a kind.
 *
 * @return void
 */
function delete_kind_aj(): void {
	if ( ! check_ajax_referer( 'kcDbrTMMfFqh6jy8&LrCGoH7p', 'nonce' ) ) {
		wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
	}
	if ( ! isset( $_POST['kind_id'] ) ) {
		wp_die( esc_html__( 'Tried to delete kind, but kind_id not set.', 'wp-museum' ) );
	}
	$kind_id = intval( $_POST['kind_id'] );
	if ( isset( $_SERVER['PHP_SELF'] ) ) {
		$form_url = wp_unslash( $_SERVER['PHP_SELF'] ); // phpcs:ignore
	} else {
		$form_url = '';
	}
	if ( delete_kind( $kind_id ) ) {
		wp_send_json_success( [] );
	} else {
		wp_send_json_error( [ 'message' => 'Error deleting kind' ] );
	}
}

/**
 * AJAX handler for deleting an image zip file.
 *
 * @return void
 */
function delete_image_zip_aj(): void {
	if ( ! check_ajax_referer( 'kcDbrTMMfFqh6jy8&LrCGoH7p', 'nonce' ) ) {
		wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
	}
	if ( ! isset( $_POST['zip_item'] ) ) {
		wp_die( esc_html__( 'Tried to delete image backup, but item name not set.', 'wp-museum' ) );
	}
	$zip_item = sanitize_file_name( wp_unslash( $_POST['zip_item'] ) );
	if ( delete_image_backup_file( $zip_item ) ) {
		wp_send_json_success( [] );
	} else {
		wp_send_json_error( [ 'message' => 'Error deleting image backup file.' ] );
	}
}

/**
 * Displays the form for editing a kind.
 *
 * @param int $kind_id The ID of the kind to edit.
 * @return void
 */
function edit_kind_form(int $kind_id = -1): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'wp-museum' ) );
	}

	$form_action = $_SERVER['PHP_SELF'] . '?page=wpm-objects-admin&wpm-objects-page=wpm-edit-kind'; //phpcs:ignore
	if ( -1 !== $kind_id ) {
		$form_action .= '&oid=' . $kind_id;
	}

	global $wpdb;
	$kind_table = $wpdb->prefix . WPM_PREFIX . 'mobject_fields';

	/*
	 * Process submitted form.
	 */

	if ( isset( $_POST['save-object'] ) ) {
		if ( ! isset( $_POST['wpm-objects-admin-nonce'] ) ||
			! check_admin_referer( 'd78HG@YsELh2KByUgCTuDCepW', 'wpm-objects-admin-nonce' ) ) {
			wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
		}
		if ( isset( $_POST['hierarchical'] ) && 1 === $_POST['hierarchical'] ) {
			$object_data['hierarchical'] = 1;
		} else {
			$object_data['hierarchical'] = 0;
		}
		if ( isset( $_POST['categorized'] ) && 1 === $_POST['categorized'] ) {
			$object_data['categorized'] = 1;
		} else {
			$object_data['categorized'] = 0;
		}
		if ( isset( $_POST['must_featured_image'] ) && 1 === $_POST['must_featured_image'] ) {
			$object_data['must_featured_image'] = 1;
		} else {
			$object_data['must_featured_image'] = 0;
		}
		if ( isset( $_POST['must_gallery'] ) && 1 === $_POST['must_gallery'] ) {
			$object_data['must_gallery'] = 1;
		} else {
			$object_data['must_gallery'] = 0;
		}
		if ( isset( $_POST['strict_checking'] ) && 1 === $_POST['strict_checking'] ) {
			$object_data['strict_checking'] = 1;
		} else {
			$object_data['strict_checking'] = 0;
		}
		if ( ! isset( $_POST['object_description'] ) ) {
			$object_data['description'] = '';
		} else {
			$object_data['description'] = str_replace( '~', '-', sanitize_text_field( wp_unslash( $_POST['object_description'] ) ) );
		}
		if ( isset( $_POST['cat_field_id'] ) ) {
			$object_data['cat_field_id'] = sanitize_key( wp_unslash( $_POST['cat_field_id'] ) );
		}
		// TODO: wp_die is not very elegant. Also see below.
		if ( ! isset( $_POST['object_name'] ) || 0 === strlen( sanitize_text_field( wp_unslash( $_POST['object_name'] ) ) ) ) {
			wp_die( esc_html__( 'All objects must have a name.', 'wp-museum' ) );
		} else {
			$object_data['label'] = str_replace( '~', '-', sanitize_text_field( wp_unslash( $_POST['object_name'] ) ) );
		}
		if ( -1 === $kind_id ) {
			$kind_id      = new_kind( $object_data );
			$form_action .= '&oid=' . $kind_id;
			if ( -1 === $kind_id ) {
				wp_die( esc_html__( 'Error creating object.', 'wp-museum' ) );
			}
		} else {
			update_kind( $kind_id, $object_data );
		}

		$submitted_form = array();

		// Translate POST into form matching database. The submitted form is
		// encoded in the form row~column (see below).
		foreach ( $_POST as $post_key => $post_val ) {
			if ( strpos( $post_key, '~' ) && 'save-object' !== $post_key ) {
				$key_array                              = explode( '~', $post_key );
				$key_row                                = $key_array[0];
				$key_col                                = $key_array[1];
				$submitted_form[ $key_row ][ $key_col ] = $post_val;
			}
		}

		// For checkboxes that weren't submitted, we need to explicitly set the value to 0.
		if ( isset( $submitted_form ) ) {
			foreach ( $submitted_form as &$form_row ) {
				if ( ! isset( $form_row['delete'] ) ) {
					$form_row['delete'] = 0;
				}
				if ( ! isset( $form_row['public'] ) ) {
					$form_row['public'] = 0;
				}
				if ( ! isset( $form_row['required'] ) ) {
					$form_row['required'] = 0;
				}
				if ( ! isset( $form_row['quick_browse'] ) ) {
					$form_row['quick_browse'] = 0;
				}
			}
		}

		foreach ( $submitted_form as $key => &$form_row ) {
			if ( substr( $key, 0, strlen( WPM_FIELD ) ) === WPM_FIELD ) { // New fields.
				$form_row['kind_id'] = $kind_id;
				$form_row['slug']    = field_slug_from_name( $form_row['name'] );
				if ( 1 !== intval( $form_row['delete'] ) ) {
					unset( $form_row['delete'] );
					$wpdb->insert( $kind_table, $form_row );
				}
			} elseif ( 1 === intval( $form_row['delete'] ) ) { // Delete fields.
				$successful_delete = $wpdb->query(
					$wpdb->prepare(
						"DELETE FROM $kind_table WHERE kind_id=%d AND field_id=%d", //phpcs:ignore
						$kind_id,
						$form_row['field_id']
					)
				);
				if ( $successful_delete ) {
					$change_log[] = "Deleted FIELD: {$form_row['name']}";
				} else {
					$change_log[] = "Error deleting FIELD: {$form_row['label']}";
				}
			} else { // Update fields.
				unset( $form_row['delete'] );
				$db_rows     = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM $kind_table WHERE kind_id=%s", $kind_id ) ); //phpcs:ignore
				$field_slugs = [];
				$db_fields   = [];
				foreach ( $db_rows as $db_row ) {
					$db_fields[ $db_row->field_id ]   = $db_row;
					$field_slugs[ $db_row->field_id ] = $db_row->slug;
				}
				foreach ( $form_row as $key => $val ) {
					$change = false;
					if ( $db_fields[ (int) $form_row['field_id'] ]->$key !== $val ) {
						$change       = true;
						$change_log[] = "FIELD: {$form_row['name']} COL: $key FROM: {$db_fields[$form_row['field_id']]->$key} TO: $val";
					}
					if ( ! isset( $field_slugs[ $form_row['field_id'] ] ) ) {
						$old_slug = '';
					} else {
						$old_slug = $field_slugs[ $form_row['field_id'] ];
					}
					$form_row['slug'] = field_slug_from_name( $form_row['name'] );
					if ( $form_row['slug'] !== $old_slug ) {
						$meta_table = $wpdb->prefix . 'postmeta';
						$wpdb->query(
							$wpdb->prepare(
								"UPDATE $meta_table SET meta_key=%s WHERE meta_key=%s", //phpcs:ignore
								$form_row['slug'],
								$old_slug
							)
						);
					}
					if ( $change ) {
						$wpdb->update(
							$kind_table,
							$form_row,
							[ 'field_id' => $form_row['field_id'] ]
						);
					}
				}
			}
		}
	}

	if ( -1 !== $kind_id ) {
		$rows         = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM $kind_table WHERE kind_id = %d ORDER BY display_order", $kind_id ) ); // phpcs:ignore
		$object_table = $wpdb->prefix . WPM_PREFIX . 'mobject_kinds';
		$object_data  = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM $object_table WHERE kind_id = %d", $kind_id ), ARRAY_A )[0]; // phpcs:ignore
	} else {
		$rows = [];
	}
	if ( ! isset( $object_data['label'] ) ) {
		$object_data['label'] = '';
	}
	if ( ! isset( $object_data['description'] ) ) {
		$object_data['description'] = '';
	}
	if ( ! isset( $object_data['hierarchical'] ) ) {
		$object_data['hierarchical'] = 0;
	}
	if ( ! isset( $object_data['categorized'] ) ) {
		$object_data['categorized'] = 0;
	}
	if ( ! isset( $object_data['must_featured_image'] ) ) {
		$object_data['must_featured_image'] = 0;
	}
	if ( ! isset( $object_data['must_gallery'] ) ) {
		$object_data['must_gallery'] = 0;
	}
	if ( ! isset( $object_data['strict_checking'] ) ) {
		$object_data['strict_checking'] = 0;
	}

	$id_select  = "<select name='cat_field_id'>";
	$id_select .= '<option></option>';
	$fields     = get_mobject_fields( $kind_id );
	if ( ! is_null( $fields ) ) {
		foreach ( $fields as $field ) {
			$id_select .= "<option value='$field->field_id'";
			if ( intval( $object_data['cat_field_id'] ) === $field->field_id ) {
				$id_select .= " selected='selected' ";
			}
			$id_select .= ">$field->name</option>";
		}
	}
	$id_select .= '</select>';

	/*
	 * Display the form.
	 */
	?>
	<div class="wrap">
		<form name="object_fields_form" method="post" action="<?php echo esc_html( wp_unslash( $form_action ) ); ?>">
		<?php wp_nonce_field( 'd78HG@YsELh2KByUgCTuDCepW', 'wpm-objects-admin-nonce' ); ?>
		<div id='wpm-object-top-buttons'>
			<input type="submit" class="button button-primary button-large" name="save-object" value="Save" />
		</div>
		<h1 class="wp-heading">Edit Museum Object Type</h1>
			<table id="wpm-edit-kind" class="wpm-object">
				<tr><th>Object Name:</th><td><input type="text" style="width:100%;" name="object_name" value="<?php echo esc_html( wp_unslash( $object_data['label'] ) ); ?>"/></td></tr>
				<tr><th>Object Description:</th><td><textarea style="width:100%;" name="object_description"><?php echo esc_html( wp_unslash( $object_data['description'] ) ); ?></textarea></td></tr>
				<tr><th>ID Field:</th></td><td><?php echo $id_select; //phpcs:ignore ?></td></tr>
				<tr><th>Options:</th><td>
					<table><tr>
						<td><ul>
						<li><input type="checkbox" 
						<?php
						if ( $object_data['strict_checking'] > 0 ) {
							echo 'checked="checked"';}
						?>
						name="strict_checking" value="1"/> Strictly enforce requirements</li>
						<li><input type="checkbox" 
						<?php
						if ( $object_data['hierarchical'] > 0 ) {
							echo 'checked="checked"';}
						?>
						name="hierarchical" value="1"/> Hierarchical</li>
						<li><input type="checkbox" 
						<?php
						if ( $object_data['categorized'] > 0 ) {
							echo 'checked="checked"';}
						?>
						name="categorized" value="1"/> Must be categorized</li>
						</ul></td>
						<td><ul>
						<li><input type="checkbox" 
						<?php
						if ( $object_data['must_featured_image'] > 0 ) {
							echo 'checked="checked"';}
						?>
						name="must_featured_image" value="1"/> Must have featured image</li>
						<li><input type="checkbox" 
						<?php
						if ( $object_data['must_gallery'] > 0 ) {
							echo 'checked="checked"';}
						?>
						name="must_gallery" value="1"/> Must have image gallery</li>
						</ul></td>
					</table></tr>
			</table>
		<h2 class="wp-heading">Object Fields</h2>
		<?php
		object_fields_table( $rows );
		?>
		<div id='wpm-object-bottom-buttons'>
			<button type='button' class='button button-large' onclick='add_field("<?php echo esc_html( wp_unslash( WPM_FIELD ) ); ?>", <?php echo count( $rows ); ?>);'>Add Field</button>
			<input type="submit" class="button button-primary button-large" name="save-object" value="Save" />
		</div>
		</form>
	</div>
	<?php
}

/**
 * Table of fields for editing individual objects. Helper function for edit_kind_form()
 *
 * @param [StdObj] $rows Array of objects each corresponding to a table row / museum object field.
 */
function object_fields_table( $rows ) {
	?>
	<table id="wpm-object-fields-table" class="widefat striped wp-list-table wpm-object">
		<tr>
			<th></th>
			<th class="check-column"><span class="dashicons dashicons-trash"></span></th>
			<th>Field</th>
			<th>Type</th>
			<th>Help Text</th>
			<th>Schema</th>
			<th class="check-column">Public</th>
			<th class="check-column">Required</th>
			<th class="check-column">Quick</th>
		</tr>
		<?php
		$order_counter = 0;
		foreach ( $rows as $row ) {
			if ( ! is_null( $row->display_order ) && $row->display_order > $order_counter ) {
				$order_counter = $row->display_order + 1;
			}
		}
		foreach ( $rows as $row ) {

			if ( is_null( $row->display_order ) ) {
				$row->display_order = $order_counter;
				++$order_counter;
			}
			$row_id = 'wpm-row-' . $row->display_order;
			?>
			<tr id="<?php echo esc_html( wp_unslash( $row_id ) ); ?>">
				<td>
					<input type="hidden" id="doi-<?php echo esc_html( wp_unslash( $row_id ) ); ?>" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~display_order" value="<?php echo esc_html( wp_unslash( $row->display_order ) ); ?>"/>
					<a class='clickable' onclick="wpm_reorder_table('<?php echo esc_html( wp_unslash( $row_id ) ); ?>', -1);"><span class="dashicons dashicons-arrow-up-alt2"></span></a><br />
					<a class='clickable' onclick="wpm_reorder_table('<?php echo esc_html( wp_unslash( $row_id ) ); ?>', 1);"><span class="dashicons dashicons-arrow-down-alt2"></span></a>
				</td>
				<td>
					<input type="hidden" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~field_id" value="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>"/>
					<input type="checkbox" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~delete" value="1"/>
				</td>
				<td><input type="text" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~name" value="<?php echo esc_html( wp_unslash( $row->name ) ); ?>" /></td>
				<td>
					<select name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~type">
						<option value="varchar" 
						<?php
						if ( 'varchar' === $row->type ) {
							print 'selected="selected"';}
						?>
						">Short String</option>
						<option value="text" 
						<?php
						if ( 'text' === $row->type ) {
							print 'selected="selected"';}
						?>
						">Text</option>
						<option value="date" 
						<?php
						if ( 'date' === $row->type ) {
							print 'selected="selected"';}
						?>
						">Date</option>
						<option value="tinyint" 
						<?php
						if ( 'tinyint' === $row->type ) {
							print 'selected="selected"';}
						?>
						">True/False</option>
					</select>
				</td>
				<td>
					<textarea name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~help_text" rows=3 cols=25>
						<?php echo esc_html( wp_unslash( $row->help_text ) ); ?>
					</textarea>
				</td>
				<td>
					<input type="text" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~field_schema" value="<?php echo esc_html( wp_unslash( $row->field_schema ) ); ?>" />
				</td>
				<td>
					<input type="checkbox" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~public" 
						<?php
						if ( $row->public > 0 ) {
							echo 'checked="checked"';}
						?>
						value="1"
					/>
				</td>
				<td>
					<input type="checkbox" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~required" 
						<?php
						if ( $row->required > 0 ) {
							echo 'checked="checked"';}
						?>
						value="1"
					/>
				</td>
				<td>
					<input type="checkbox" name="<?php echo esc_html( wp_unslash( $row->field_id ) ); ?>~quick_browse" 
						<?php
						if ( $row->quick_browse > 0 ) {
							echo 'checked="checked"';}
						?>
						value="1"
					/>
				</td>
			</tr>
			<?php
		}
		?>
	</table>
	<?php
	if ( count( $rows ) < 1 ) {
		echo "<div class='empty-table-notification' id='wpm-object-fields-empty'>Object contains no fields.</div>";
	}
}

/**
 * Processes actions from GET / POST requests for object admin page.
 */
function process_actions() {
	if ( isset( $_GET['action'] ) ) {
		if ( ! check_admin_referer( 'd78HG@YsELh2KByUgCTuDCepW', 'wpm-objects-admin-nonce' ) ) {
			wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
		}
		process_uploaded_csv();
	}
}

/**
 * Generates a field slug from a field's name.
 *
 * Converts a field's name as set by user, that may have capitals, spaces, special
 * characters to a slug with only lowercase, spaces replaced by '-', and no special
 * characters. Does not do collision checking.
 *
 * @param string $name Field name as set by user.
 */
function field_slug_from_name( $name ) {
	$name = preg_replace( '/[^A-Za-z0-9 ]/', '', $name );
	return substr( trim( strtolower( str_replace( ' ', '-', $name ) ) ), 0, 255 );
}
