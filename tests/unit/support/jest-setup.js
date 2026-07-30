/**
 * Extra globals for the jsdom test environment.
 *
 * jsdom does not implement TextEncoder/TextDecoder, which react-dom/server
 * requires at import time. Node provides both.
 */
const { TextEncoder, TextDecoder } = require( 'util' );

if ( typeof global.TextEncoder === 'undefined' ) {
	global.TextEncoder = TextEncoder;
}

if ( typeof global.TextDecoder === 'undefined' ) {
	global.TextDecoder = TextDecoder;
}
