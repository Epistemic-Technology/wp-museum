<?php
/**
 * Functions for export and import of csv and image files.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

/**
 * Output csv to save. This is called by setting the Get parameter wpm_ot_csv to
 * an object type (collection, exhibit, instrument, etc.).
 *
 * @link https://www.virendrachandak.com/techtalk/creating-csv-file-using-php-and-mysql/
 */
function export_csv() {
	if ( ! isset( $_GET[ WPM_PREFIX . 'ot_csv' ] ) ) {
		return;
	}

	// Skip nonce check during unit tests
	if ( ! defined( 'WP_TESTS_DOMAIN' ) && ! defined( 'WPM_TESTING' ) ) {
		if ( ! check_admin_referer( 'd78HG@YsELh2KByUgCTuDCepW', 'wpm-objects-admin-nonce' ) ) {
			wp_die( esc_html__( 'Failed nonce check', 'wp-museum' ) );
		}
	}
	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'wp-museum' ) );
	}
	$kind_id = intval( $_GET[ WPM_PREFIX . 'ot_csv' ] );
	$sort_col = isset( $_GET['sort_col'] ) ? sanitize_text_field( wp_unslash( $_GET['sort_col'] ) ) : 'post_title';
	$sort_dir = isset( $_GET['sort_dir'] ) ? sanitize_text_field( wp_unslash( $_GET['sort_dir'] ) ) : 'asc';
	$kind    = get_kind( $kind_id );

	if ( ! $kind ) {
		wp_die( esc_html__( 'Invalid object kind.', 'wp-museum' ) );
	}

	$args   = [
		'post_type'   => $kind->type_name,
		'post_status' => 'any',
		'numberposts' => -1,
	];
	$posts  = get_posts( $args );
	$fields = get_mobject_fields( $kind_id );
	$rows   = [];
	foreach ( $posts as $the_post ) {
		$row          = get_post_custom( $the_post->ID );
		$sorted_row   = sort_row_by_fields( $row, $fields );
		$sorted_row[] = get_permalink( $the_post );
		$sorted_row[] = $the_post->post_status;
		array_unshift( $sorted_row, wp_strip_all_tags( $the_post->post_content ) );
		array_unshift( $sorted_row, html_entity_decode( $the_post->post_title ) );
		$rows[] = $sorted_row;
	}

	// Sort the rows by the specified column
	if ( $sort_col === 'post_title' ) {
		$col_index = 0; // Title is the first column
	} elseif ( $sort_col === 'post_content' ) {
		$col_index = 1; // Content is the second column
	} else {
		// Find the column index for custom fields
		$col_index = null;
		foreach ( $fields as $index => $field ) {
			if ( $field->slug === $sort_col ) {
				$col_index = $index + 2; // +2 because title and content are first
				break;
			}
		}
	}

	if ( $col_index !== null ) {
		usort( $rows, function( $a, $b ) use ( $col_index, $sort_dir ) {
			$result = strcmp( $a[$col_index], $b[$col_index] );
			return $sort_dir === 'desc' ? -$result : $result;
		});
	}

	$header_row = [ 'Title', 'Content' ];
	$slug_row   = [ 'post_title', 'post_content' ];
	foreach ( $fields as $field ) {
		$header_row[] = $field->name;
		$slug_row[]   = $field->slug;
	}
	array_push( $header_row, 'Permalink', 'Publication Status' );
	array_push( $slug_row, 'permalink', 'post_status' );

	// Skip headers during unit tests
	if ( ! defined( 'WP_TESTS_DOMAIN' ) && ! defined( 'WPM_TESTING' ) ) {
		header( 'Content-type: text/csv' );
		$filename = $kind->name . '_export.csv';
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
		header( 'Pragma: no-cache' );
		header( 'Expires: 0' );
	}

	$file = fopen( 'php://output', 'w' );
	fputcsv( $file, $header_row, ',', '"', "\\" );
	fputcsv( $file, $slug_row, ',', '"', "\\" );
	foreach ( $rows as $row ) {
		fputcsv( $file, $row, ',', '"', "\\" );
	}

	// Allow tests to prevent exit
	if ( defined( 'WP_TESTS_DOMAIN' ) || defined( 'WPM_TESTING' ) ) {
		return;
	}

	exit();
}

/**
 * Process uploaded CSV file for import and output status report.
 *
 * phpcs:disable WordPress.Security.NonceVerification
 */
function process_uploaded_csv() {
	if ( ! isset( $_GET['action'] ) ) {
		return '';
	}

	if ( 'csv_upload' === sanitize_key( $_GET['action'] ) ) {
		if ( ! isset( $_FILES['csv-upload-file']['name'] ) ) {
			return;
		}
		$file_name = sanitize_file_name( $_FILES['csv-upload-file']['name'] );
		if (
				isset( $_FILES['csv-upload-file'] ) &&
				isset( $_FILES['csv-upload-file']['error'] ) &&
				isset( $_FILES['csv-upload-file']['tmp_name'] ) &&
				UPLOAD_ERR_OK === $_FILES['csv-upload-file']['error'] &&
				file_exists( sanitize_file_name( $file_name ) ) &&
				isset( $_POST['import-kind-id'] )
			) {
			$kind_id = intval( $_POST['import-kind-id'] );
			$results = import_csv( $kind_id, $file_name );
			if ( $results[1] ) {
				echo '<div class="updated error">Error: ' . esc_html( $results[1] ) . '</div>';
			}
			echo "<div class='updated'>Updated Objects:<ul>";
			if ( ! $results[0] ) {
				echo '<li>No objects updated.</li>';
			} elseif ( count( $results[0] ) > 20 ) {
				echo '<li>Updated ' . count( $results[0] ) . ' objects.</li>';
			} else {
				foreach ( $results[0] as $result ) {
					echo '<li>' . esc_html( $result ) . '</li>';
				}
			}
			echo '</div>';
		}
	}
}

/**
 * Import uploaded csv file. For each row of the sheet will update objects that exist or create
 * objects that don't. Objects are identified according to the catalog id field rather than
 * WordPress's post_id, so that import/export is portable across installations.
 *
 * @link https://stackoverflow.com/questions/9139202/how-to-parse-a-csv-file-using-php
 *
 * @param int    $kind_id Id of target kind for import.
 * @param string $csvfile Path to csv file for importing.
 *
 * @return [[string], string] Array where first element is list of changed objects and second
 *                            contains error message or '' on success.
 */
function import_csv( $kind_id, $csvfile ) {
	$kind      = get_kind( $kind_id );
	$cat_field = get_mobject_field( $kind->kind_id, $kind->cat_field_id );
	if ( is_null( $kind ) ) {
		return [ false, 'Error retrieving kind for import.' ];
	}
	if ( is_null( $kind->cat_field_id ) ) {
		return [ false, 'Kind must have a category field set for import from CSV.' ];
	}

	$handle = fopen( $csvfile, 'rb' );
	if ( ! $handle ) {
		return [ false, 'Error opening uploaded CSV file.' ];
	}

	/**
	 * Check for UTF-8 BOM and skip over if found. Can be an issue with MS Excel CSV export.
	 *
	 * @link https://www.php.net/manual/en/function.fgetcsv.php#122696
	 */
	$bom = "\xef\xbb\xbf";
	if ( fgets( $handle, 4 ) !== $bom ) {
		rewind( $handle );
	}

	$header_row = fgetcsv( $handle, 0, ',', '"', '\\' );
	$slug_row   = fgetcsv( $handle, 0, ',', '"', '\\' );
	$col_count  = count( $slug_row );
	$rows       = [];

	for ( $i = 0; $i < $col_count; $i++ ) {
		$column_names[ $slug_row[ $i ] ] = $header_row[ $i ];
	}

	//phpcs:ignore Generic.CodeAnalysis.AssignmentInCondition.FoundInWhileCondition
	while ( $data = fgetcsv( $handle, 0, ',', '"', '\\' ) ) {
		$row       = [];
		$cat_value = '';
		for ( $column = 0; $column < $col_count; $column++ ) {
			if ( ! isset( $data[ $column ] ) ) {
				return [
					false,
					'Mismatch between header column count and data column count. Check CSV formatting.',
				];
			}
			$row[ $slug_row[ $column ] ] = $data[ $column ];
			if ( $slug_row[ $column ] === $cat_field->slug ) {
				$cat_id = $data[ $column ];
			}
		}
		if ( $cat_id ) {
			$rows[ $cat_id ] = $row;
		}
	}
	fclose( $handle );

	/**
	 * Compare $rows with post data and update.
	 */
	$change_log = [];
	foreach ( $rows as $cat_id => $fields ) {
		$post = get_object_post_from_id( $kind, $cat_id );
		if ( $post ) {
			$custom            = get_post_custom( $post->ID );
			$changed_cols      = [];
			$changed_post_vars = false;
			if ( ! in_array(
				$fields['post_status'],
				[ 'publish', 'pending', 'draft', 'private' ],
				true
			) ) {
				$fields['post_status'] = $post->post_status;
			}
			if ( html_entity_decode( $post->post_title ) !== $fields['post_title'] ) {
				$changed_post_vars = true;
				$changed_cols[]    = 'Post Title';
			}
			if ( html_entity_decode( $post->post_content ) !== $fields['post_content'] ) {
				$changed_post_vars = true;
				$changed_cols[]    = 'Content';
			}
			if ( $fields['post_status'] !== $post->post_status ) {
				$changed_post_vars = true;
				$changed_cols[]    = 'Publication Status';
			}
			if ( $changed_post_vars ) {
				$post_vars = [
					'ID'           => $post->ID,
					'post_title'   => $fields['post_title'],
					'post_content' => htmlentities( $fields['post_content'] ),
				];
				$post_vars = sanitize_post( $post_vars, 'db' );
				wp_update_post( $post_vars );
			}
			unset( $fields['post_title'] );
			unset( $fields['post_content'] );
			unset( $fields['post_status'] );
			foreach ( $fields as $field_slug => $field_value ) {
				if ( isset( $custom[ $field_slug ] ) && $field_value !== $custom[ $field_slug ][0] ) {
					$changed_cols[] = $column_names[ $field_slug ];
					update_post_meta( $post->ID, $field_slug, $field_value, $custom[ $field_slug ][0] );
				}
			}
			if ( $changed_cols ) {
				$edit_url     = admin_url( "post.php?post={$post->ID}&action=edit" );
				$change_log[] =
					"<a href='$edit_url'>" .
					$cat_id .
					'</a> - ' .
					$post->post_title .
					' - ' .
					implode( ', ', $changed_cols );
			}
		}
	}
	return ( [ $change_log, '' ] );
}

/**
 * Delete a directory from the filesystem. Used as a helper function for
 * export_images_aj.
 *
 * @link https://stackoverflow.com/questions/1653771/how-do-i-remove-a-directory-that-is-not-empty
 *
 * @param string $dir Absolute path of directory to delete.
 *
 * @return bool True on success.
 */
function delete_directory( $dir ) {
	if ( ! file_exists( $dir ) ) {
		return true;
	}
	foreach ( scandir( $dir ) as $item ) {
		if ( '.' === $item || '..' === $item ) {
			continue;
		}
		if ( ! is_dir( $dir . DIRECTORY_SEPARATOR . $item ) ) {
			if ( ! unlink( $dir . DIRECTORY_SEPARATOR . $item ) ) {
				return false;
			}
		} elseif ( ! delete_directory( $dir . DIRECTORY_SEPARATOR . $item ) ) {
				return false;
		}
	}
	return rmdir( $dir );
}

/**
 * Delete image backup zip file from the filesystem. Ensures that can only
 * delete from the image backup directory and only delete image backup
 * files.
 *
 * @param string $filename Name of backup file to delete (not path!).
 *
 * @return bool True if file did exist in correct location and was deleted.
 */
function delete_image_backup_file( $filename ) {
	$dir_info = wp_upload_dir();
	if ( ! $dir_info ) {
		return false;
	}
	if ( substr( $filename, -3 ) !== 'zip' ) {
		return false;
	}
	$zip_dir  = $dir_info['basedir'] . DIRECTORY_SEPARATOR . IMAGE_DIR;
	$zip_path = $zip_dir . DIRECTORY_SEPARATOR . $filename;
	if ( ! file_exists( $zip_path ) ) {
		return false;
	}
	return unlink( $zip_path );
}

/**
 * Creates zip file for export with all images attached to Museum Objects. File
 * names are formatted so that they can be imported back to objects. File is
 * saved to uploads/IMAGE_DIR
 *
 * Image name format: {objectkind->type_name}_{cat_id}_{0-n}.jpg
 * ZIP name format: {WPM_PREFIX}{mobject type name}_images_dd-mm-yyyy.zip
 *
 * @link https://www.php.net/manual/en/book.zip.php
 */
function export_images_aj() {
	if ( ! check_ajax_referer( 'kcDbrTMMfFqh6jy8&LrCGoH7p', 'nonce' ) ) {
		wp_die( esc_html__( 'Failed nonce check.', 'wp-museum' ) );
	}

	$zip_dir  = wp_upload_dir()['basedir'] . DIRECTORY_SEPARATOR . IMAGE_DIR;
	$temp_dir = $zip_dir . DIRECTORY_SEPARATOR . 'tmp';

	if ( ! file_exists( $zip_dir ) ) {
		if ( ! mkdir( $zip_dir ) ) {
			wp_die(
				esc_html__(
					'Cannot write to uploads directory. Make sure file permissions are set correctly.',
					'wp-museum'
				)
			);
		}
	}
	if ( ! is_dir( $zip_dir ) ) {
		wp_die(
			esc_html__(
				'Conflict writing to uploads directory. A file already exists with the name ',
				'wp-museum'
			) . esc_html( IMAGE_DIR . '.' )
		);
	}
	if ( file_exists( $temp_dir ) ) {
		if ( is_dir( $temp_dir ) ) {
			if ( ! delete_directory( $temp_dir ) ) {
				echo ( '0' );
				die();
			}
		} else {
			unlink( $temp_dir );
		}
	}
	mkdir( $temp_dir );

	$manifest_filename = $temp_dir . DIRECTORY_SEPARATOR . 'manifest.csv';
	$manifest          = fopen( $manifest_filename, 'wb' );
	$header_row        = [
		'Kind',
		'Object Name',
		'Object ID',
		'Image ID',
		'Image Order',
		'Image URL',
		'Filename',
	];
	fputcsv( $manifest, $header_row, ',', '"', '\\' );

	$kinds = get_mobject_kinds();
	foreach ( $kinds as $kind ) {
		$kind_dir = $temp_dir . DIRECTORY_SEPARATOR . sanitize_file_name( $kind->name );
		mkdir( $kind_dir );
		$mobject_posts = get_posts(
			[
				'numberposts' => -1,
				'post_type'   => $kind->type_name,
				'post_status' => 'any',
			]
		);
		foreach ( $mobject_posts as $mobject_post ) {
			$custom    = get_post_custom( $mobject_post->ID );
			$cat_field = get_mobject_field( $kind->kind_id, $kind->cat_field_id );

			if ( isset( $custom[ $cat_field->slug ] ) && $custom[ $cat_field->slug ][0] ) {
				$sanitized_name = sanitize_file_name( str_replace( '.', '_', $custom[ $cat_field->slug ][0] ) );
				$base_filename  = $sanitized_name . '_';
			} else {
				$base_filename = 'pid_' . $mobject_post->ID . '_';
			}

			$images    = get_object_image_attachments( $mobject_post->ID );
			$image_num = 0;
			foreach ( $images as $image_id => $image_order ) {
				$metadata = wp_get_attachment_metadata( $image_id );
				if ( ! isset( $metadata['file'] ) ) {
					continue;
				}
				$path_parts = pathinfo( $metadata['file'] );
				if ( $path_parts['extension'] ) {
					$extension = '.' . $path_parts['extension'];
				} else {
					$extension = '';
				}
				if ( ! copy(
					wp_upload_dir()['basedir'] . DIRECTORY_SEPARATOR . addslashes( $metadata['file'] ),
					$kind_dir . DIRECTORY_SEPARATOR . $base_filename . $image_num . $extension
				) ) {
					wp_die( esc_html__( 'Error copying image files to temp directory.', 'wp-museum' ) );
				}
				++$image_num;
				$row = [
					$kind->label,
					$mobject_post->post_title,
					$mobject_post->ID,
					$image_id,
					$image_order,
					esc_url( wp_upload_dir()['baseurl'] . '/' . $metadata['file'] ),
					sanitize_file_name( $kind->name ) . DIRECTORY_SEPARATOR . $base_filename . $image_num . $extension,
				];
				fputcsv( $manifest, $row, ',', '"', '\\' );
			}
		}
	}
	fclose( $manifest );

	$zipfile           = $zip_dir . DIRECTORY_SEPARATOR . gmdate( 'Y-m-d' ) . '.zip';
	$duplicate_counter = 1;
	$original_zipfile  = $zipfile;
	while ( file_exists( $zipfile ) ) {
		$path_parts = pathinfo( $original_zipfile );
		$zipfile    =
			$path_parts['dirname'] .
			DIRECTORY_SEPARATOR .
			$path_parts['filename'] .
			'_' . $duplicate_counter .
			'.' .
			$path_parts['extension'];
		++$duplicate_counter;
	}
	try {
		$phar = new \PharData( $zipfile );
		$phar->buildFromDirectory( $temp_dir );
	} catch ( \PharException $e ) {
		echo ( '0' );
		delete_directory( $temp_dir );
		die();
	}
	if ( ! delete_directory( $temp_dir ) ) {
		echo ( '0' );
		die();
	}
	display_image_backups_table();
	die();
}

/**
 * Outputs a link for exporting a kind type to CSV.
 *
 * @param   int/string $kind_id  The object's ID (a number).
 */
function export_csv_button( int $kind_id, string $sort_col = 'post_title', string $sort_dir = 'asc') {
	if ( isset( $_SERVER['PHP_SELF'] ) ) {
		$url = esc_url(
			add_query_arg(
				[
					WPM_PREFIX . 'ot_csv'     => $kind_id,
					'sort_col'                => $sort_col,
					'sort_dir'                => $sort_dir,
					'wpm-objects-admin-nonce' => wp_create_nonce( 'd78HG@YsELh2KByUgCTuDCepW' ),
				],
				sanitize_url( wp_unslash( $_SERVER['PHP_SELF'] ) )
			)
		);
	} else {
		$url = '';
	}
	echo "<a class='button' href='" . esc_html( $url ) . "'>Export CSV</a>";
}

/**
 * Generates a link for importing from CSV to update museum objects.
 *
 * @param   int/string $kind_id  The object's ID (a number).
 */
function import_csv_button( $kind_id ) {
	echo "<a class='button import-csv-button' data-kind-id='" . intval( $kind_id ) . "'>Import CSV</a>";
}

/**
 * Displays a form for uploading a CSV of museum object data to be imported.
 *
 * @param string $csv_url URL of script that will process the upload.
 */
function display_csv_upload_form( $csv_url ) {
	$csv_url = esc_url( $csv_url );
	echo(
		"<div class='upload-plugin-wrap'>
			<div id='csv-upload-section' class='upload-plugin'>
				<p id='csv-upload-help' class='install-help'>Select a CSV file to import.</p>
				<form enctype='multipart/form-data' method='post' class='wp-upload-form' action='"
	);
	echo esc_html( $csv_url );
	echo(
		"'>
					<label class='screen-reader-text' for='csv-upload-file'>CSV import file.</label>
					<input type='file' accept='.csv' id='csv-upload-file' name='csv-upload-file' />
					<input type='hidden' id='import-kind-id' name='import-kind-id' />
					<input type='submit' id='csv-upload-submit' name='csv-upload-submit' class='button' value='Import' disabled>
				</form>
			</div>
		</div>"
	);
}
