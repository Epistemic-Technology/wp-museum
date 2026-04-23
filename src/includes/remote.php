<?php
/**
 * Functions for handling remote museum connections.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Checks if a cross-origin request to the rest api is authorized.
 *
 * This returns true under the following conditions:
 *     - The request is not cross-site OR
 *     - The request is cross-site AND remote requests are allowed AND
 *         - The request comes from a registered remote site that isn't blocked OR
 *         - Unregistered requests are allowed and the URL is not blocked.
 *
 * @param WP_REST_Request $request The REST request.
 *
 * @return bool True if the request is authorized.
 */
function rest_request_authorized( $request ) {
	if ( ! get_option( 'allow_remote_requests' ) ) {
		return false;
	}
	if ( ! origin_authorized() ) {
		return false;
	}
	if ( get_option( 'allow_unregistered_requests' ) ) {
		return true;
	}
	$uuid = $request->get_param( 'uuid' );
	if ( empty( $uuid ) ) {
		return false;
	}
	$client = RemoteClient::from_uuid( $uuid );
	if ( is_null( $client->client_id ) || $client->blocked ) {
		return false;
	}
	return true;
}

/**
 * Checks if the origin domain is authorized to make REST requests.
 *
 * @param string|null $origin The url of the origin, or null to use $_SERVER['HTTP_ORIGIN'].
 */
function origin_authorized( $origin = null ) {
	if ( ! get_option( 'allow_remote_requests' ) ) {
		return false;
	}
	$rest_authorized_domains = get_option( 'rest_authorized_domains' );
	if ( is_null( $origin ) ) {
		if ( empty( $_SERVER['HTTP_ORIGIN'] ) ) {
			return false;
		}
		$origin = esc_url_raw( wp_unslash( $_SERVER['HTTP_ORIGIN'] ) );
	}

	$authorized = false;
	if ( ! $rest_authorized_domains ) {
		$authorized = true;
	} else {
		$authorized_domains = array_map( 'trim', explode( ',', $rest_authorized_domains ) );
		foreach ( $authorized_domains as $domain ) {
			if ( strpos( $origin, $domain ) !== false ) {
				$authorized = true;
				break;
			}
		}
	}
	return $authorized;
}

/**
 * Allows REST requests from other sites.
 */
function handle_preflight() {
	if ( ! get_option( 'allow_remote_requests' ) ) {
		return;
	}
	if ( empty( $_SERVER['HTTP_ORIGIN'] ) ) {
		return;
	}

	$origin = esc_url_raw( wp_unslash( $_SERVER['HTTP_ORIGIN'] ) );
	if ( ! origin_authorized( $origin ) ) {
		return;
	}

	header( "Access-Control-Allow-Origin: $origin" );
	header( 'Access-Control-Allow-Methods: POST, GET' );
	header( 'Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization' );
}
add_action( 'rest_api_init', __NAMESPACE__ . '\handle_preflight' );
